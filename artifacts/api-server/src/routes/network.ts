import { Router, type IRouter } from "express";
import { eq, and, ilike, or, inArray, desc } from "drizzle-orm";
import { db, rfqsTable, rfqQuotesTable, usersTable, organizationsTable, ratingsTable, projectsTable, photosTable, projectVendorsTable, projectPhasesTable } from "@workspace/db";
import {
  RfqParams,
  CreateRfqBody,
  UpdateRfqStatusBody,
  CreateRfqQuoteBody,
  QuoteParams,
  UpdateRfqQuoteStatusBody,
  CreateRatingBody,
  SubProfileParams,
  BuilderProfileParams,
  FindQueryParams,
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

    // 1. Open RFQs matching specialty + city
    const openRfqs = await db
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
        completedAt:   rfqsTable.completedAt,
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

    // 2. Awarded RFQs where this sub has an accepted quote
    const acceptedQuotes = await db
      .select({ rfqId: rfqQuotesTable.rfqId })
      .from(rfqQuotesTable)
      .where(and(
        eq(rfqQuotesTable.subcontractorId, user.id),
        eq(rfqQuotesTable.status, "accepted"),
      ));

    const awardedRfqs =
      acceptedQuotes.length > 0
        ? await db
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
              completedAt:   rfqsTable.completedAt,
              createdAt:     rfqsTable.createdAt,
              createdByName: usersTable.name,
            })
            .from(rfqsTable)
            .leftJoin(usersTable, eq(rfqsTable.createdBy, usersTable.id))
            .where(inArray(rfqsTable.id, acceptedQuotes.map(q => q.rfqId)))
        : [];

    // Combine, deduplicate by id
    const seenIds = new Set<number>();
    const rfqs = [];
    for (const rfq of [...openRfqs, ...awardedRfqs]) {
      if (!seenIds.has(rfq.id)) { seenIds.add(rfq.id); rfqs.push(rfq); }
    }

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
        completedAt:   rfqsTable.completedAt,
        createdAt:     rfqsTable.createdAt,
        createdByName: usersTable.name,
        projectId:     rfqsTable.projectId,
        projectName:   projectsTable.name,
      })
      .from(rfqsTable)
      .leftJoin(usersTable, eq(rfqsTable.createdBy, usersTable.id))
      .leftJoin(projectsTable, eq(rfqsTable.projectId, projectsTable.id))
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

  const { title, description, specialty, city, budget_min, budget_max, start_date, project_id } = parsed.data;

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
      projectId: project_id ?? null,
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

  // Auto-crear project_vendor cuando se acepta una quote ligada a un proyecto
  if (parsed.data.status === "accepted" && rfq.projectId && rfq.organizationId) {
    const [sub] = await db
      .select({
        id:             usersTable.id,
        name:           usersTable.name,
        category:       usersTable.category,
        email:          usersTable.email,
        serviceCity:    usersTable.serviceCity,
        organizationId: usersTable.organizationId,
      })
      .from(usersTable)
      .where(eq(usersTable.id, updated.subcontractorId));

    if (sub) {
      const [existingVendor] = await db
        .select({ id: projectVendorsTable.id, contractAmount: projectVendorsTable.contractAmount })
        .from(projectVendorsTable)
        .where(and(
          eq(projectVendorsTable.projectId,    rfq.projectId),
          eq(projectVendorsTable.linkedUserId, updated.subcontractorId),
        ));

      if (existingVendor) {
        if (existingVendor.contractAmount !== updated.amount) {
          await db
            .update(projectVendorsTable)
            .set({ contractAmount: updated.amount })
            .where(eq(projectVendorsTable.id, existingVendor.id));
        }
      } else {
        await db
          .insert(projectVendorsTable)
          .values({
            projectId:      rfq.projectId,
            organizationId: rfq.organizationId,
            createdBy:      user.id,
            name:           sub.name,
            type:           "subcontractor",
            specialty:      sub.category      ?? undefined,
            email:          sub.email         ?? undefined,
            linkedUserId:   updated.subcontractorId,
            contractAmount: updated.amount,
            contractNotes:  updated.message ?? undefined,
          });
      }

      // ── Auto-crear proyecto espejo para el sub ───────────────────────────
      if (rfq.projectId) {
        // 1. Proyecto original
        const [originalProject] = await db
          .select()
          .from(projectsTable)
          .where(eq(projectsTable.id, rfq.projectId));

        if (originalProject) {
          // 2. Info del builder para usarla como cliente en el espejo
          const [builderUser] = await db
            .select({ name: usersTable.name, email: usersTable.email })
            .from(usersTable)
            .where(eq(usersTable.id, user.id));

          // 3. Obtener o crear organización del sub
          let subOrgId = sub.organizationId;
          if (!subOrgId) {
            const slug = `${sub.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${updated.subcontractorId}`;
            const [newOrg] = await db
              .insert(organizationsTable)
              .values({ name: sub.name, slug })
              .returning({ id: organizationsTable.id });
            subOrgId = newOrg.id;
            await db
              .update(usersTable)
              .set({ organizationId: subOrgId })
              .where(eq(usersTable.id, updated.subcontractorId));
          }

          // 4. Verificar que no existe ya un proyecto espejo
          const [existingMirror] = await db
            .select({ id: projectsTable.id })
            .from(projectsTable)
            .where(and(
              eq(projectsTable.linkedProjectId, rfq.projectId),
              eq(projectsTable.builderId, updated.subcontractorId),
            ));

          if (!existingMirror) {
            // Nombre de la empresa del builder para el campo notes
            let builderOrgName = builderUser?.name ?? "Constructor";
            if (user.organizationId) {
              const [builderOrg] = await db
                .select({ name: organizationsTable.name })
                .from(organizationsTable)
                .where(eq(organizationsTable.id, user.organizationId));
              if (builderOrg) builderOrgName = builderOrg.name;
            }

            // 5. Crear el proyecto espejo
            const [mirrorProject] = await db
              .insert(projectsTable)
              .values({
                organizationId:  subOrgId,
                builderId:       updated.subcontractorId,
                clientName:      builderUser?.name ?? "Constructor",
                clientEmail:     builderUser?.email ?? null,
                name:            originalProject.name,
                address:         originalProject.address,
                status:          "active",
                projectType:     originalProject.projectType ?? undefined,
                linkedProjectId: rfq.projectId,
                progress:        0,
                notes:           `Linked project - ${builderOrgName}`,
              })
              .returning();

            // 6. Copiar fases del proyecto original
            const phases = await db
              .select()
              .from(projectPhasesTable)
              .where(eq(projectPhasesTable.projectId, rfq.projectId));

            if (phases.length > 0) {
              await db
                .insert(projectPhasesTable)
                .values(
                  phases.map(p => ({
                    projectId:    mirrorProject.id,
                    phaseTitle:   p.phaseTitle,
                    activityText: p.activityText,
                    activityType: p.activityType ?? undefined,
                    completed:    false,
                    included:     p.included,
                    sortOrder:    p.sortOrder,
                  }))
                );
            }
          }
        }
      }
      // ─────────────────────────────────────────────────────────────────────
    }
  }

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

// ─── GET /api/find (público, sin auth) ───────────────────────────────────────
router.get("/find", async (req, res): Promise<void> => {
  const parsed = FindQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { role, specialty, city, page, limit } = parsed.data;

  const conds = [
    role
      ? eq(usersTable.role, role)
      : or(eq(usersTable.role, "builder"), eq(usersTable.role, "subcontractor"), eq(usersTable.role, "supplier")),
  ];
  if (specialty) conds.push(ilike(usersTable.category, `%${specialty}%`));
  if (city) conds.push(
    or(ilike(usersTable.serviceCity, `%${city}%`), ilike(organizationsTable.state, `%${city}%`)),
  );

  const users = await db
    .select({
      id:            usersTable.id,
      name:          usersTable.name,
      role:          usersTable.role,
      profilePhoto:  usersTable.profilePhoto,
      companyLogo:   usersTable.companyLogo,
      category:      usersTable.category,
      serviceCity:   usersTable.serviceCity,
      serviceRadius: usersTable.serviceRadius,
      companyName:   organizationsTable.companyName,
      state:         organizationsTable.state,
    })
    .from(usersTable)
    .leftJoin(organizationsTable, eq(usersTable.organizationId, organizationsTable.id))
    .where(and(...(conds as any[])));

  if (users.length === 0) { res.json({ data: [], page, limit, total: 0 }); return; }

  const userIds    = users.map(u => u.id);
  const builderIds = users.filter(u => u.role === "builder").map(u => u.id);

  const projectRows = builderIds.length > 0
    ? await db
        .select({ builderId: projectsTable.builderId })
        .from(projectsTable)
        .where(and(inArray(projectsTable.builderId, builderIds), eq(projectsTable.status, "completed")))
    : [];
  const projectCountMap = new Map<number, number>();
  for (const p of projectRows) {
    const bid = p.builderId as number;
    projectCountMap.set(bid, (projectCountMap.get(bid) ?? 0) + 1);
  }

  const ratingRows = await db
    .select({ ratedId: ratingsTable.ratedId, quality: ratingsTable.quality, punctuality: ratingsTable.punctuality, communication: ratingsTable.communication })
    .from(ratingsTable)
    .where(inArray(ratingsTable.ratedId, userIds));
  const ratingsByUser = new Map<number, { quality: number; punctuality: number; communication: number }[]>();
  for (const r of ratingRows) {
    const arr = ratingsByUser.get(r.ratedId) ?? [];
    arr.push(r);
    ratingsByUser.set(r.ratedId, arr);
  }

  const items = users.map(u => {
    const totalProjects = projectCountMap.get(u.id) ?? 0;
    const ratings       = ratingsByUser.get(u.id) ?? [];
    const totalRatings  = ratings.length;
    const averageRating = totalRatings > 0
      ? Math.round((ratings.reduce((s, r) => s + (r.quality + r.punctuality + r.communication) / 3, 0) / totalRatings) * 10) / 10
      : 0;

    const badges: string[] = [];
    if (u.role === "builder") {
      if (totalProjects >= 3)                        badges.push("verified");
      if (averageRating >= 4.5 && totalRatings >= 5) badges.push("top_rated");
      if (totalProjects >= 10)                       badges.push("experienced");
    } else {
      if (totalRatings >= 3)                         badges.push("verified");
      if (averageRating >= 4.5 && totalRatings >= 5) badges.push("top_rated");
    }

    return {
      id: u.id, role: u.role as "builder" | "subcontractor",
      name: u.name, profilePhoto: u.profilePhoto, companyLogo: u.companyLogo,
      companyName: u.companyName, state: u.state, category: u.category,
      serviceCity: u.serviceCity, serviceRadius: u.serviceRadius,
      stats: { totalProjects, averageRating, totalRatings },
      badges,
    };
  }).sort((a, b) => {
    if (b.stats.averageRating !== a.stats.averageRating) return b.stats.averageRating - a.stats.averageRating;
    return b.stats.totalRatings - a.stats.totalRatings;
  });

  const total = items.length;
  const start = (page - 1) * limit;
  res.json({ data: items.slice(start, start + limit), page, limit, total });
});

// ─── GET /api/builders/:builderId (público, sin auth) ────────────────────────
router.get("/builders/:builderId", async (req, res): Promise<void> => {
  const parsed = BuilderProfileParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { builderId } = parsed.data;

  // 1. Builder user
  const [builder] = await db
    .select({
      id:             usersTable.id,
      name:           usersTable.name,
      profilePhoto:   usersTable.profilePhoto,
      companyLogo:    usersTable.companyLogo,
      createdAt:      usersTable.createdAt,
      organizationId: usersTable.organizationId,
    })
    .from(usersTable)
    .where(and(eq(usersTable.id, builderId), eq(usersTable.role, "builder")));

  if (!builder) { res.status(404).json({ error: "Builder not found" }); return; }

  // 2. Organization data
  let orgData = { companyName: null as string | null, licenseNumber: null as string | null, state: null as string | null, phone: null as string | null };
  if (builder.organizationId) {
    const [org] = await db
      .select({ companyName: organizationsTable.companyName, licenseNumber: organizationsTable.licenseNumber, state: organizationsTable.state, phone: organizationsTable.phone })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, builder.organizationId));
    if (org) orgData = org;
  }

  // 3. Completed projects count
  const allCompleted = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(and(eq(projectsTable.builderId, builderId), eq(projectsTable.status, "completed")));
  const totalProjects = allCompleted.length;

  // 4. Ratings received (subs rating this builder)
  const ratings = await db
    .select({ quality: ratingsTable.quality, punctuality: ratingsTable.punctuality, communication: ratingsTable.communication })
    .from(ratingsTable)
    .where(and(eq(ratingsTable.ratedId, builderId), eq(ratingsTable.role, "sub_rating_builder")));
  const totalRatings = ratings.length;
  const averageRating = totalRatings > 0
    ? Math.round((ratings.reduce((s, r) => s + (r.quality + r.punctuality + r.communication) / 3, 0) / totalRatings) * 10) / 10
    : 0;

  // 5. Portfolio: last 6 completed projects
  const portfolioRows = await db
    .select({ id: projectsTable.id, name: projectsTable.name, address: projectsTable.address, projectType: projectsTable.projectType, startDate: projectsTable.startDate })
    .from(projectsTable)
    .where(and(eq(projectsTable.builderId, builderId), eq(projectsTable.status, "completed")))
    .orderBy(desc(projectsTable.createdAt))
    .limit(6);

  // 6. Photos for those projects (max 4 each, visible_to_client = true)
  let portfolio = portfolioRows.map(p => ({ ...p, photos: [] as { fileUrl: string }[] }));
  if (portfolioRows.length > 0) {
    const ids = portfolioRows.map(p => p.id);
    const photos = await db
      .select({ projectId: photosTable.projectId, fileUrl: photosTable.fileUrl })
      .from(photosTable)
      .where(and(inArray(photosTable.projectId, ids), eq(photosTable.visibleToClient, true)))
      .orderBy(desc(photosTable.createdAt));

    const byProject = new Map<number, { fileUrl: string }[]>();
    for (const ph of photos) {
      const arr = byProject.get(ph.projectId) ?? [];
      if (arr.length < 4) arr.push({ fileUrl: ph.fileUrl });
      byProject.set(ph.projectId, arr);
    }
    portfolio = portfolioRows.map(p => ({ ...p, photos: byProject.get(p.id) ?? [] }));
  }

  // 7. Badges
  const badges: string[] = [];
  if (totalProjects >= 3)                        badges.push("verified");
  if (averageRating >= 4.5 && totalRatings >= 5) badges.push("top_rated");
  if (totalProjects >= 10)                       badges.push("experienced");

  res.json({
    id:           builder.id,
    name:         builder.name,
    profilePhoto: builder.profilePhoto,
    companyLogo:  builder.companyLogo,
    createdAt:    builder.createdAt,
    ...orgData,
    stats:     { totalProjects, totalRatings, averageRating },
    portfolio,
    badges,
  });
});

// ─── GET /api/subs/:subId (público, sin auth) ────────────────────────────────
router.get("/subs/:subId", async (req, res): Promise<void> => {
  const parsed = SubProfileParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [sub] = await db
    .select({
      id:            usersTable.id,
      name:          usersTable.name,
      category:      usersTable.category,
      serviceCity:   usersTable.serviceCity,
      serviceRadius: usersTable.serviceRadius,
      createdAt:     usersTable.createdAt,
    })
    .from(usersTable)
    .where(and(
      eq(usersTable.id, parsed.data.subId),
      eq(usersTable.role, "subcontractor"),
    ));

  if (!sub) { res.status(404).json({ error: "Subcontractor not found" }); return; }

  const ratings = await db
    .select({
      quality:       ratingsTable.quality,
      punctuality:   ratingsTable.punctuality,
      communication: ratingsTable.communication,
      comment:       ratingsTable.comment,
      createdAt:     ratingsTable.createdAt,
    })
    .from(ratingsTable)
    .where(eq(ratingsTable.ratedId, sub.id));

  const total = ratings.length;
  const avg = (fn: (r: (typeof ratings)[0]) => number) =>
    total > 0 ? Math.round((ratings.reduce((s, r) => s + fn(r), 0) / total) * 10) / 10 : 0;

  const averages = {
    quality:       avg(r => r.quality),
    punctuality:   avg(r => r.punctuality),
    communication: avg(r => r.communication),
    overall:       avg(r => (r.quality + r.punctuality + r.communication) / 3),
    total,
  };

  res.json({ ...sub, ratings, averages });
});

// ─── GET /sitemap.xml (público, sin auth) ────────────────────────────────────
router.get("/sitemap.xml", async (req, res): Promise<void> => {
  const users = await db
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(or(eq(usersTable.role, "builder"), eq(usersTable.role, "subcontractor")));

  const base = "https://slably.app";

  const urls = [
    `  <url>\n    <loc>${base}/find</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>`,
    ...users.map(u => {
      const path = u.role === "builder" ? `builder/${u.id}` : `sub/${u.id}`;
      return `  <url>\n    <loc>${base}/${path}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
    }),
  ];

  res.setHeader("Content-Type", "application/xml");
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`,
  );
});

export default router;
