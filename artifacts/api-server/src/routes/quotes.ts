import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import {
  db,
  quotesTable, quoteAreasTable, quoteTasksTable, quotePriceHistoryTable,
  projectsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { transcribeAudio } from "../lib/openai.js";

const upload = multer({ storage: multer.memoryStorage() });

const router: IRouter = Router();

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey: key });
}

function calcMargin(cost: number, clientPrice: number): number {
  if (clientPrice === 0) return 0;
  return Math.round(((clientPrice - cost) / clientPrice) * 100 * 100) / 100;
}

// ── POST /api/quotes/transcribe ───────────────────────────────────────────────
router.post("/quotes/transcribe", requireAuth, upload.single("audio"), async (req: AuthRequest, res): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "No audio file provided" }); return; }

  const ext = req.file.mimetype.includes("ogg") ? "ogg"
    : req.file.mimetype.includes("mp4") ? "mp4"
    : req.file.mimetype.includes("mpeg") ? "mp3"
    : "webm";

  const tmpPath = path.join(os.tmpdir(), `qt-audio-${randomUUID()}.${ext}`);
  fs.writeFileSync(tmpPath, req.file.buffer);

  try {
    const text = await transcribeAudio(tmpPath, "en");
    res.json({ text });
  } catch (err) {
    console.error("[Quotes/transcribe] Whisper error:", err);
    res.status(500).json({ error: "Transcription failed. Please try again." });
  } finally {
    fs.unlink(tmpPath, () => {});
  }
});

// ── POST /api/quotes/analyze ──────────────────────────────────────────────────
router.post("/quotes/analyze", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { rawInput, city, state, address, clientName, projectType } = req.body as {
    rawInput: string; city: string; state: string;
    address?: string; clientName?: string; projectType?: string;
  };

  if (!rawInput?.trim()) {
    res.status(400).json({ error: "rawInput is required" });
    return;
  }

  const user = req.user!;

  // Fetch builder's price history for this city/org
  const history = await db
    .select()
    .from(quotePriceHistoryTable)
    .where(
      and(
        eq(quotePriceHistoryTable.organizationId, user.organizationId!),
        city ? eq(quotePriceHistoryTable.city, city) : undefined,
      ) as any
    )
    .orderBy(desc(quotePriceHistoryTable.createdAt))
    .limit(30);

  const historyText = history.length > 0
    ? history.map(h =>
        `${h.taskName} | Labor/unit: $${h.laborCostPerUnit ?? "?"} | Material/unit: $${h.materialCostPerUnit ?? "?"} | Unit: ${h.unit ?? "?"} | City: ${h.city}`
      ).join("\n")
    : `No previous history — use market prices for ${city}, ${state}`;

  const systemPrompt = `You are an expert construction estimator in the United States with 20+ years of experience in residential remodeling and new construction. You specialize in the Latino contractor market in Texas, Florida, and California.

Your job: break down a job described in free-form text into areas and tasks with realistic market prices.

CRITICAL RULES:
1. Tasks the contractor explicitly mentioned → isAiDetected: true, isAiSuggested: false
2. Tasks you think of that they did NOT mention → isAiDetected: false, isAiSuggested: true, with a clear suggestionReason in English explaining why it matters
3. Prices must be REALISTIC for the given city and current year
4. Always separate labor vs material costs
5. If a task has a measurable unit (sqft, lf, ea), include quantity and unit price
6. Be THOROUGH with suggestions. For isAiSuggested tasks, think about:
   - Prep work often forgotten (surface prep, masking, protection of adjacent areas)
   - Code requirements (permits, inspections)
   - Cleanup and disposal (debris removal, haul away, dumpster)
   - Finishing details (caulking, touch-up paint, hardware, accessories)
   - Hidden work often discovered during demo (subfloor repair, water damage, mold treatment)
   - Safety items (temporary barriers, dust control)
   Minimum 4-6 suggestions per area.
7. RESPOND ONLY WITH VALID JSON. No text before or after. No markdown.
8. For bathroom projects always suggest:
   waterproofing membrane, exhaust fan, towel bars, toilet paper holder,
   mirror, debris removal, permit if over $5K
9. For kitchen projects always suggest:
   backsplash, under-cabinet lighting, garbage disposal, permit, debris removal
10. For painting projects always suggest:
    surface prep/patching, primer coat, trim/baseboards, drop cloth protection,
    furniture moving
11. For any remodel always suggest:
    final cleanup, debris haul away, touch-up work, punch list items`;

  const userPrompt = `BUILDER'S PRICE HISTORY FOR THIS CITY (use as primary reference if available):
${historyText}

PROJECT CONTEXT:
Project type: ${projectType || "not specified"}
Location: ${address ? address + ", " : ""}${city}, ${state}
Client: ${clientName || "not provided"}

BUILDER INPUT:
"${rawInput}"

Respond with this exact JSON structure:
{
  "projectType": "remodel" | "new_construction" | "repair" | "addition",
  "city": "${city}",
  "state": "${state}",
  "scopeSummary": "1-2 sentence summary of the total job scope",
  "areas": [
    {
      "name": "descriptive area name",
      "scopeSummary": "what specifically is being done in this area",
      "tasks": [
        {
          "name": "task name",
          "trade": "demo|framing|drywall|tile|flooring|plumbing|electrical|hvac|painting|cabinetry|countertops|cleanup|permits|general",
          "unit": "sqft|lf|ea|hr|null",
          "quantity": number_or_null,
          "laborCost": total_labor_dollars,
          "materialCost": total_material_dollars,
          "marketLaborMin": market_min,
          "marketLaborMax": market_max,
          "marketMaterialMin": market_min,
          "marketMaterialMax": market_max,
          "marketNote": "Market ${city}: $X–$Y per sqft" or null,
          "isAiDetected": true,
          "isAiSuggested": false,
          "suggestionReason": null
        }
      ]
    }
  ]
}`;

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    console.error("[Quotes/analyze] OpenAI error:", err);
    res.status(500).json({ error: "AI analysis failed. Please try again." });
  }
});

// ── POST /api/quotes ──────────────────────────────────────────────────────────
router.post("/quotes", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  const body = req.body as {
    title: string;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    city?: string;
    state?: string;
    rawInput?: string;
    projectType?: string;
    scopeSummary?: string;
    markupPercent?: number;
    areas: Array<{
      name: string;
      scopeSummary?: string;
      sortOrder?: number;
      tasks: Array<{
        name: string;
        trade?: string;
        unit?: string;
        quantity?: number;
        laborCost: number;
        materialCost: number;
        marketLaborMin?: number;
        marketLaborMax?: number;
        marketMaterialMin?: number;
        marketMaterialMax?: number;
        marketNote?: string;
        isIncluded?: boolean;
        isAiDetected?: boolean;
        isAiSuggested?: boolean;
        suggestionReason?: string;
        sortOrder?: number;
      }>;
    }>;
  };

  const markupPct = body.markupPercent ?? 25;

  // Calculate totals
  let totalLabor = 0;
  let totalMaterial = 0;

  const areasWithTotals = body.areas.map((area, ai) => {
    let areaLabor = 0;
    let areaMaterial = 0;
    const tasks = area.tasks.map((t, ti) => {
      const included = t.isIncluded !== false;
      const labor = included ? (t.laborCost ?? 0) : 0;
      const mat   = included ? (t.materialCost ?? 0) : 0;
      areaLabor    += labor;
      areaMaterial += mat;
      return { ...t, sortOrder: ti };
    });
    totalLabor    += areaLabor;
    totalMaterial += areaMaterial;
    return { ...area, tasks, sortOrder: ai, totalLaborCost: areaLabor, totalMaterialCost: areaMaterial, totalCost: areaLabor + areaMaterial };
  });

  const totalCost   = totalLabor + totalMaterial;
  const clientPrice = totalCost * (1 + markupPct / 100);
  const margin      = calcMargin(totalCost, clientPrice);

  const [quote] = await db.insert(quotesTable).values({
    organizationId:         user.organizationId!,
    createdBy:              user.id,
    title:                  body.title,
    clientName:             body.clientName,
    clientEmail:            body.clientEmail,
    clientPhone:            body.clientPhone,
    city:                   body.city,
    state:                  body.state,
    rawInput:               body.rawInput,
    projectType:            body.projectType,
    scopeSummary:           body.scopeSummary,
    markupPercent:          String(markupPct),
    totalLaborCost:         String(totalLabor),
    totalMaterialCost:      String(totalMaterial),
    totalCost:              String(totalCost),
    clientPrice:            String(clientPrice),
    estimatedMarginPercent: String(margin),
    aiModel:                "gpt-4o",
    aiProcessedAt:          new Date(),
  }).returning();

  const priceHistoryRows: any[] = [];

  for (const area of areasWithTotals) {
    const [dbArea] = await db.insert(quoteAreasTable).values({
      quoteId:          quote.id,
      organizationId:   user.organizationId!,
      name:             area.name,
      scopeSummary:     area.scopeSummary,
      sortOrder:        area.sortOrder,
      totalLaborCost:   String(area.totalLaborCost),
      totalMaterialCost: String(area.totalMaterialCost),
      totalCost:        String(area.totalCost),
      clientPrice:      String(area.totalCost * (1 + markupPct / 100)),
    }).returning();

    for (const task of area.tasks) {
      const taskTotal = (task.laborCost ?? 0) + (task.materialCost ?? 0);
      await db.insert(quoteTasksTable).values({
        quoteId:          quote.id,
        areaId:           dbArea.id,
        organizationId:   user.organizationId!,
        name:             task.name,
        trade:            (task.trade ?? "general") as any,
        unit:             task.unit,
        quantity:         task.quantity != null ? String(task.quantity) : undefined,
        laborCost:        String(task.laborCost ?? 0),
        materialCost:     String(task.materialCost ?? 0),
        totalCost:        String(taskTotal),
        marketLaborMin:   task.marketLaborMin   != null ? String(task.marketLaborMin)   : undefined,
        marketLaborMax:   task.marketLaborMax   != null ? String(task.marketLaborMax)   : undefined,
        marketMaterialMin: task.marketMaterialMin != null ? String(task.marketMaterialMin) : undefined,
        marketMaterialMax: task.marketMaterialMax != null ? String(task.marketMaterialMax) : undefined,
        marketNote:       task.marketNote,
        isIncluded:       task.isIncluded !== false,
        isAiDetected:     task.isAiDetected !== false,
        isAiSuggested:    task.isAiSuggested === true,
        suggestionReason: task.suggestionReason,
        sortOrder:        task.sortOrder ?? 0,
      });

      if (task.isIncluded !== false) {
        const qty = task.quantity ?? 1;
        priceHistoryRows.push({
          organizationId:      user.organizationId!,
          quoteId:             quote.id,
          taskName:            task.name,
          trade:               (task.trade ?? "general") as any,
          city:                body.city,
          state:               body.state,
          unit:                task.unit,
          quantity:            String(qty),
          laborCostPerUnit:    String((task.laborCost ?? 0) / qty),
          materialCostPerUnit: String((task.materialCost ?? 0) / qty),
          laborCostTotal:      String(task.laborCost ?? 0),
          materialCostTotal:   String(task.materialCost ?? 0),
          wasAiSuggested:      task.isAiSuggested === true,
          wasAccepted:         true,
        });
      }
    }
  }

  if (priceHistoryRows.length > 0) {
    await db.insert(quotePriceHistoryTable).values(priceHistoryRows);
  }

  const full = await fetchFullQuote(quote.id);
  res.status(201).json(full);
});

// ── GET /api/quotes ───────────────────────────────────────────────────────────
router.get("/quotes", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  const quotes = await db
    .select({
      id:          quotesTable.id,
      title:       quotesTable.title,
      clientName:  quotesTable.clientName,
      clientPrice: quotesTable.clientPrice,
      status:      quotesTable.status,
      city:        quotesTable.city,
      state:       quotesTable.state,
      createdAt:   quotesTable.createdAt,
      projectId:   quotesTable.projectId,
    })
    .from(quotesTable)
    .where(and(
      eq(quotesTable.organizationId, user.organizationId!),
      eq(quotesTable.deletedAt, null as any),
    ) as any)
    .orderBy(desc(quotesTable.createdAt));

  res.json(quotes);
});

// ── GET /api/quotes/:id ───────────────────────────────────────────────────────
router.get("/quotes/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  const id   = parseInt(req.params.id as string);

  const quote = await fetchFullQuote(id);
  if (!quote || quote.organizationId !== user.organizationId!) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }

  res.json(quote);
});

// ── PATCH /api/quotes/:id ─────────────────────────────────────────────────────
router.patch("/quotes/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  const id   = parseInt(req.params.id as string);

  const [existing] = await db.select().from(quotesTable).where(
    and(eq(quotesTable.id, id), eq(quotesTable.organizationId, user.organizationId!))
  );
  if (!existing) { res.status(404).json({ error: "Quote not found" }); return; }

  const updates: any = { ...req.body, updatedAt: new Date() };

  if (updates.markupPercent !== undefined) {
    const cost   = parseFloat(existing.totalCost ?? "0");
    const markup = parseFloat(updates.markupPercent);
    const price  = cost * (1 + markup / 100);
    updates.clientPrice            = String(price);
    updates.estimatedMarginPercent = String(calcMargin(cost, price));
    updates.markupPercent          = String(markup);
  }

  if (updates.status) {
    if (updates.status === "sent")     updates.sentAt     = new Date();
    if (updates.status === "approved") updates.approvedAt = new Date();
  }

  await db.update(quotesTable).set(updates).where(eq(quotesTable.id, id));
  const full = await fetchFullQuote(id);
  res.json(full);
});

// ── PATCH /api/quotes/:id/tasks/:taskId ──────────────────────────────────────
router.patch("/quotes/:id/tasks/:taskId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user   = req.user!;
  const quoteId = parseInt(req.params.id as string);
  const taskId  = parseInt(req.params.taskId as string);

  const [existing] = await db.select().from(quotesTable).where(
    and(eq(quotesTable.id, quoteId), eq(quotesTable.organizationId, user.organizationId!))
  );
  if (!existing) { res.status(404).json({ error: "Quote not found" }); return; }

  const body = req.body as { laborCost?: number; materialCost?: number; isIncluded?: boolean };
  const taskUpdates: any = { updatedAt: new Date() };

  if (body.laborCost   !== undefined) taskUpdates.laborCost   = String(body.laborCost);
  if (body.materialCost !== undefined) taskUpdates.materialCost = String(body.materialCost);
  if (body.isIncluded  !== undefined) taskUpdates.isIncluded  = body.isIncluded;

  if (body.laborCost !== undefined || body.materialCost !== undefined) {
    const [task] = await db.select().from(quoteTasksTable).where(eq(quoteTasksTable.id, taskId));
    const labor = body.laborCost    ?? parseFloat(task?.laborCost    ?? "0");
    const mat   = body.materialCost ?? parseFloat(task?.materialCost ?? "0");
    taskUpdates.totalCost = String(labor + mat);
  }

  await db.update(quoteTasksTable).set(taskUpdates).where(eq(quoteTasksTable.id, taskId));

  // Recalculate area + quote totals
  const allTasks = await db.select().from(quoteTasksTable).where(eq(quoteTasksTable.quoteId, quoteId));
  const areas    = await db.select().from(quoteAreasTable).where(eq(quoteAreasTable.quoteId, quoteId));

  let totalLabor = 0;
  let totalMat   = 0;

  for (const area of areas) {
    const areaTasks = allTasks.filter(t => t.areaId === area.id && t.isIncluded);
    const aL = areaTasks.reduce((s, t) => s + parseFloat(t.laborCost ?? "0"), 0);
    const aM = areaTasks.reduce((s, t) => s + parseFloat(t.materialCost ?? "0"), 0);
    totalLabor += aL;
    totalMat   += aM;
    await db.update(quoteAreasTable).set({
      totalLaborCost: String(aL), totalMaterialCost: String(aM), totalCost: String(aL + aM), updatedAt: new Date(),
    }).where(eq(quoteAreasTable.id, area.id));
  }

  const totalCost   = totalLabor + totalMat;
  const markupPct   = parseFloat(existing.markupPercent ?? "25");
  const clientPrice = totalCost * (1 + markupPct / 100);
  const margin      = calcMargin(totalCost, clientPrice);

  await db.update(quotesTable).set({
    totalLaborCost: String(totalLabor), totalMaterialCost: String(totalMat),
    totalCost: String(totalCost), clientPrice: String(clientPrice),
    estimatedMarginPercent: String(margin), updatedAt: new Date(),
  }).where(eq(quotesTable.id, quoteId));

  const full = await fetchFullQuote(quoteId);
  res.json(full);
});

// ── POST /api/quotes/:id/convert ─────────────────────────────────────────────
router.post("/quotes/:id/convert", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user    = req.user!;
  const quoteId = parseInt(req.params.id as string);

  const [quote] = await db.select().from(quotesTable).where(
    and(eq(quotesTable.id, quoteId), eq(quotesTable.organizationId, user.organizationId!))
  );
  if (!quote) { res.status(404).json({ error: "Quote not found" }); return; }

  if (quote.projectId) {
    const [proj] = await db.select().from(projectsTable).where(eq(projectsTable.id, quote.projectId));
    res.json({ quote, project: proj });
    return;
  }

  const [project] = await db.insert(projectsTable).values({
    organizationId: user.organizationId!,
    builderId:      user.id,
    name:           quote.title,
    clientName:     quote.clientName ?? "TBD",
    clientEmail:    quote.clientEmail ?? undefined,
    address:        quote.address ?? (quote.city ? `${quote.city}, ${quote.state}` : "TBD"),
    status:         "planning",
    progress:       0,
  }).returning();

  await db.update(quotesTable).set({
    status:      "converted",
    convertedAt: new Date(),
    projectId:   project.id,
    updatedAt:   new Date(),
  }).where(eq(quotesTable.id, quoteId));

  const updatedQuote = await fetchFullQuote(quoteId);
  res.json({ quote: updatedQuote, project });
});

// ── helper ────────────────────────────────────────────────────────────────────
async function fetchFullQuote(id: number) {
  const [quote] = await db.select().from(quotesTable).where(eq(quotesTable.id, id));
  if (!quote) return null;

  const areas = await db
    .select()
    .from(quoteAreasTable)
    .where(eq(quoteAreasTable.quoteId, id))
    .orderBy(quoteAreasTable.sortOrder);

  const tasks = await db
    .select()
    .from(quoteTasksTable)
    .where(eq(quoteTasksTable.quoteId, id))
    .orderBy(quoteTasksTable.sortOrder);

  return {
    ...quote,
    areas: areas.map(a => ({
      ...a,
      tasks: tasks.filter(t => t.areaId === a.id),
    })),
  };
}

export default router;
