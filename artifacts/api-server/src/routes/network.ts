import { Router, type IRouter } from "express";
import { eq, and, ilike } from "drizzle-orm";
import { db, rfqsTable, rfqQuotesTable, usersTable, organizationsTable } from "@workspace/db";
import {
  RfqParams,
  CreateRfqBody,
  UpdateRfqStatusBody,
  CreateRfqQuoteBody,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { sendRfqNotification } from "../lib/email.js";

const router: IRouter = Router();

// ─── GET /api/network/rfqs ────────────────────────────────────────────────────
router.get("/network/rfqs", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;

  if (user.role === "subcontractor") {
    const [userData] = await db
      .select({ category: usersTable.category, serviceCity: usersTable.serviceCity })
      .from(usersTable)
      .where(eq(usersTable.id, user.id));

    if (!userData?.category || !userData?.serviceCity) {
      res.json([]);
      return;
    }

    const rfqs = await db
      .select({
        id:            rfqsTable.id,
        title:         rfqsTable.title,
        description:   rfqsTable.description,
        specialty:     rfqsTable.specialty,
        city:          rfqsTable.city,
        budgetMin:     rfqsTable.budgetMin,
        budgetMax:     rfqsTable.budgetMax,
        startDate:     rfqsTable.startDate,
        status:        rfqsTable.status,
        createdAt:     rfqsTable.createdAt,
        createdByName: usersTable.name,
      })
      .from(rfqsTable)
      .leftJoin(usersTable, eq(rfqsTable.createdBy, usersTable.id))
      .where(and(
        eq(rfqsTable.specialty, userData.category),
        ilike(rfqsTable.city, `%${userData.serviceCity}%`),
        eq(rfqsTable.status, "open"),
      ));

    res.json(rfqs);
    return;
  }

  if (user.role === "builder") {
    if (!user.organizationId) { res.json([]); return; }

    const rfqs = await db
      .select({
        id:            rfqsTable.id,
        title:         rfqsTable.title,
        description:   rfqsTable.description,
        specialty:     rfqsTable.specialty,
        city:          rfqsTable.city,
        budgetMin:     rfqsTable.budgetMin,
        budgetMax:     rfqsTable.budgetMax,
        startDate:     rfqsTable.startDate,
        status:        rfqsTable.status,
        createdAt:     rfqsTable.createdAt,
        createdByName: usersTable.name,
      })
      .from(rfqsTable)
      .leftJoin(usersTable, eq(rfqsTable.createdBy, usersTable.id))
      .where(eq(rfqsTable.organizationId, user.organizationId));

    res.json(rfqs);
    return;
  }

  res.status(403).json({ error: "Forbidden" });
});

// ─── POST /api/network/rfqs ───────────────────────────────────────────────────
router.post("/network/rfqs", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const parsed = CreateRfqBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { title, description, specialty, city, budget_min, budget_max, start_date } = parsed.data;

  const [rfq] = await db
    .insert(rfqsTable)
    .values({
      organizationId: user.organizationId,
      createdBy:      user.id,
      title,
      description,
      specialty,
      city,
      budgetMin: budget_min != null ? String(budget_min) : null,
      budgetMax: budget_max != null ? String(budget_max) : null,
      startDate: start_date ?? null,
      status:    "open",
    })
    .returning();

  // Fire-and-forget: notify matching subcontractors
  (async () => {
    const matchingSubs = await db
      .select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(and(
        eq(usersTable.role, "subcontractor"),
        eq(usersTable.category, specialty),
        ilike(usersTable.serviceCity, `%${city}%`),
      ));

    let builderCompany = "Un constructor";
    if (user.organizationId) {
      const [org] = await db
        .select({ name: organizationsTable.name })
        .from(organizationsTable)
        .where(eq(organizationsTable.id, user.organizationId));
      if (org) builderCompany = org.name;
    }

    await Promise.allSettled(
      matchingSubs.map((sub) =>
        sendRfqNotification({
          to:           sub.email,
          subName:      sub.name,
          rfqTitle:     title,
          rfqCity:      city,
          rfqSpecialty: specialty,
          builderCompany,
        })
      )
    );
  })().catch((err) => console.error("[RFQ EMAIL] Batch failed:", err));

  res.status(201).json(rfq);
});

// ─── PATCH /api/network/rfqs/:rfqId ──────────────────────────────────────────
router.patch("/network/rfqs/:rfqId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;

  const params = RfqParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateRfqStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, params.data.rfqId));
  if (!existing) { res.status(404).json({ error: "RFQ not found" }); return; }
  if (existing.createdBy !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  const [updated] = await db
    .update(rfqsTable)
    .set({ status: parsed.data.status })
    .where(eq(rfqsTable.id, params.data.rfqId))
    .returning();

  res.json(updated);
});

// ─── GET /api/network/rfqs/:rfqId/quotes ─────────────────────────────────────
router.get("/network/rfqs/:rfqId/quotes", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;

  const params = RfqParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, params.data.rfqId));
  if (!rfq) { res.status(404).json({ error: "RFQ not found" }); return; }

  if (user.role === "builder") {
    if (rfq.organizationId !== user.organizationId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const quotes = await db
      .select()
      .from(rfqQuotesTable)
      .where(eq(rfqQuotesTable.rfqId, params.data.rfqId));
    res.json(quotes);
    return;
  }

  if (user.role === "subcontractor") {
    const quotes = await db
      .select()
      .from(rfqQuotesTable)
      .where(and(
        eq(rfqQuotesTable.rfqId, params.data.rfqId),
        eq(rfqQuotesTable.subcontractorId, user.id),
      ));
    res.json(quotes);
    return;
  }

  res.status(403).json({ error: "Forbidden" });
});

// ─── POST /api/network/rfqs/:rfqId/quotes ────────────────────────────────────
router.post("/network/rfqs/:rfqId/quotes", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "subcontractor") { res.status(403).json({ error: "Forbidden" }); return; }

  const params = RfqParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = CreateRfqQuoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, params.data.rfqId));
  if (!rfq) { res.status(404).json({ error: "RFQ not found" }); return; }
  if (rfq.status !== "open") { res.status(400).json({ error: "RFQ is not open" }); return; }

  const [existing] = await db
    .select()
    .from(rfqQuotesTable)
    .where(and(
      eq(rfqQuotesTable.rfqId, params.data.rfqId),
      eq(rfqQuotesTable.subcontractorId, user.id),
    ));
  if (existing) { res.status(409).json({ error: "Already submitted a quote for this RFQ" }); return; }

  const [quote] = await db
    .insert(rfqQuotesTable)
    .values({
      rfqId:           params.data.rfqId,
      subcontractorId: user.id,
      amount:          String(parsed.data.amount),
      message:         parsed.data.message ?? null,
      status:          "pending",
    })
    .returning();

  res.status(201).json(quote);
});

export default router;
