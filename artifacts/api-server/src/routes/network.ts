import { Router, type IRouter } from "express";
import { eq, and, ilike, or } from "drizzle-orm";
import { db, rfqsTable, rfqQuotesTable, usersTable, organizationsTable, ratingsTable } from "@workspace/db";
import {
  RfqParams,
  CreateRfqBody,
  UpdateRfqStatusBody,
  CreateRfqQuoteBody,
  QuoteParams,
  UpdateRfqQuoteStatusBody,
  CreateRatingBody,
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

    const baseCity = userData.serviceCity.split(",")[0].trim();

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
        or(
          ilike(rfqsTable.city, `%${baseCity}%`),
          ilike(rfqsTable.city, `%${userData.serviceCity}%`),
        ),
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
      .select({
        id:              rfqQuotesTable.id,
        rfqId:           rfqQuotesTable.rfqId,
        subcontractorId: rfqQuotesTable.subcontractorId,
        amount:          rfqQuotesTable.amount,
        message:         rfqQuotesTable.message,
        status:          rfqQuotesTable.status,
        createdAt:       rfqQuotesTable.createdAt,
        subName:         usersTable.name,
        subCategory:     usersTable.category,
      })
      .from(rfqQuotesTable)
      .leftJoin(usersTable, eq(rfqQuotesTable.subcontractorId, usersTable.id))
      .where(eq(rfqQuotesTable.rfqId, params.data.rfqId));
    res.json(quotes);
    return;
  }

  if (user.role === "subcontractor") {
    const quotes = await db
      .select({
        id:              rfqQuotesTable.id,
        rfqId:           rfqQuotesTable.rfqId,
        subcontractorId: rfqQuotesTable.subcontractorId,
        amount:          rfqQuotesTable.amount,
        message:         rfqQuotesTable.message,
        status:          rfqQuotesTable.status,
        createdAt:       rfqQuotesTable.createdAt,
        subName:         usersTable.name,
        subCategory:     usersTable.category,
      })
      .from(rfqQuotesTable)
      .leftJoin(usersTable, eq(rfqQuotesTable.subcontractorId, usersTable.id))
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

// ─── PATCH /api/network/rfqs/:rfqId/quotes/:quoteId ──────────────────────────
router.patch("/network/rfqs/:rfqId/quotes/:quoteId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const params = QuoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateRfqQuoteStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, params.data.rfqId));
  if (!rfq) { res.status(404).json({ error: "RFQ not found" }); return; }
  if (rfq.organizationId !== user.organizationId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [updated] = await db
    .update(rfqQuotesTable)
    .set({ status: parsed.data.status })
    .where(and(
      eq(rfqQuotesTable.id, params.data.quoteId),
      eq(rfqQuotesTable.rfqId, params.data.rfqId),
    ))
    .returning();

  if (!updated) { res.status(404).json({ error: "Quote not found" }); return; }
  res.json(updated);
});

// ─── POST /api/network/rfqs/:rfqId/complete ──────────────────────────────────
router.post("/network/rfqs/:rfqId/complete", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const params = RfqParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, params.data.rfqId));
  if (!rfq) { res.status(404).json({ error: "RFQ not found" }); return; }
  if (rfq.createdBy !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  const [updated] = await db
    .update(rfqsTable)
    .set({ status: "awarded", completedAt: new Date() })
    .where(eq(rfqsTable.id, params.data.rfqId))
    .returning();

  res.json(updated);
});

// ─── POST /api/network/rfqs/:rfqId/ratings ───────────────────────────────────
router.post("/network/rfqs/:rfqId/ratings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "builder" && user.role !== "subcontractor") { res.status(403).json({ error: "Forbidden" }); return; }

  const params = RfqParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = CreateRatingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, params.data.rfqId));
  if (!rfq) { res.status(404).json({ error: "RFQ not found" }); return; }
  if (rfq.completedAt == null) { res.status(400).json({ error: "RFQ is not completed yet" }); return; }

  let ratedId: number;
  let role: string;

  if (user.role === "builder") {
    if (rfq.createdBy !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }
    const [accepted] = await db
      .select()
      .from(rfqQuotesTable)
      .where(and(eq(rfqQuotesTable.rfqId, rfq.id), eq(rfqQuotesTable.status, "accepted")));
    if (!accepted) { res.status(400).json({ error: "No accepted quote found" }); return; }
    ratedId = accepted.subcontractorId;
    role = "builder_rating_sub";
  } else {
    const [myQuote] = await db
      .select()
      .from(rfqQuotesTable)
      .where(and(eq(rfqQuotesTable.rfqId, rfq.id), eq(rfqQuotesTable.subcontractorId, user.id)));
    if (!myQuote) { res.status(403).json({ error: "No quote found for this RFQ" }); return; }
    ratedId = rfq.createdBy;
    role = "sub_rating_builder";
  }

  const [existing] = await db
    .select()
    .from(ratingsTable)
    .where(and(eq(ratingsTable.rfqId, rfq.id), eq(ratingsTable.raterId, user.id)));
  if (existing) { res.status(409).json({ error: "Already rated this RFQ" }); return; }

  const [rating] = await db
    .insert(ratingsTable)
    .values({ rfqId: rfq.id, raterId: user.id, ratedId, role, ...parsed.data })
    .returning();

  res.status(201).json(rating);
});

// ─── GET /api/network/rfqs/:rfqId/ratings ────────────────────────────────────
router.get("/network/rfqs/:rfqId/ratings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;

  const params = RfqParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, params.data.rfqId));
  if (!rfq) { res.status(404).json({ error: "RFQ not found" }); return; }

  const isBuilder = user.role === "builder" && rfq.createdBy === user.id;
  const isSub = user.role === "subcontractor";
  if (!isBuilder && !isSub) { res.status(403).json({ error: "Forbidden" }); return; }

  const ratings = await db.select().from(ratingsTable).where(eq(ratingsTable.rfqId, params.data.rfqId));
  res.json(ratings);
});

export default router;
