import { Router, type IRouter } from "express";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  taxProClientsTable,
  projectsTable,
  expensesTable,
  invoicesTable,
  projectVendorsTable,
  organizationsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { Resend } from "resend";

const router: IRouter = Router();

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  return new Resend(key);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: resolve builder IDs for an authenticated tax pro
// ─────────────────────────────────────────────────────────────────────────────
async function getBuilderIds(taxProId: number): Promise<number[]> {
  const rows = await db
    .select({ builderId: taxProClientsTable.builderId })
    .from(taxProClientsTable)
    .where(
      and(
        eq(taxProClientsTable.taxProId, taxProId),
        eq(taxProClientsTable.status, "active")
      )
    );
  return rows.map((r) => r.builderId);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tax-pro/clients
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/tax-pro/clients", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "accountant") { res.status(403).json({ error: "Forbidden" }); return; }

  const connections = await db
    .select()
    .from(taxProClientsTable)
    .where(eq(taxProClientsTable.taxProId, user.id))
    .orderBy(desc(taxProClientsTable.createdAt));

  const result = await Promise.all(
    connections.map(async (conn) => {
      const [builder] = await db
        .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, conn.builderId));
      if (!builder) return null;

      const [org] = await db
        .select({ name: sql<string>`name` })
        .from(sql`organizations`)
        .where(sql`owner_id = ${builder.id}`)
        .limit(1)
        .catch(() => [{ name: null }]);

      const projects = await db
        .select({ id: projectsTable.id })
        .from(projectsTable)
        .where(eq(projectsTable.organizationId, user.organizationId ?? -1));

      const allBuilderProjects = await db
        .select({ id: projectsTable.id })
        .from(projectsTable)
        .where(sql`created_by = ${builder.id}`);

      const projectIds = allBuilderProjects.map((p) => p.id);

      let totalInvoiced = 0;
      let totalCollected = 0;
      let totalExpenses = 0;
      let pendingW9Count = 0;

      if (projectIds.length > 0) {
        const invoices = await db
          .select({ total: invoicesTable.total, status: invoicesTable.status, paidAt: invoicesTable.paidAt })
          .from(invoicesTable)
          .where(inArray(invoicesTable.projectId, projectIds));

        totalInvoiced = invoices.reduce((s, i) => s + parseFloat(i.total as string), 0);
        totalCollected = invoices
          .filter((i) => i.paidAt !== null)
          .reduce((s, i) => s + parseFloat(i.total as string), 0);

        const expenses = await db
          .select({ amount: expensesTable.amount })
          .from(expensesTable)
          .where(inArray(expensesTable.projectId, projectIds));

        totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount as string), 0);

        const vendors = await db
          .select({ w9Url: projectVendorsTable.w9Url })
          .from(projectVendorsTable)
          .where(inArray(projectVendorsTable.projectId, projectIds));

        pendingW9Count = vendors.filter((v) => !v.w9Url).length;
      }

      return {
        id: builder.id,
        name: builder.name,
        email: builder.email,
        companyName: (org as any)?.name ?? null,
        status: conn.status,
        connectionId: conn.id,
        projectCount: allBuilderProjects.length,
        totalInvoiced,
        totalCollected,
        totalExpenses,
        pendingW9Count,
      };
    })
  );

  res.json(result.filter(Boolean));
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tax-pro/clients/:builderId/summary
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/tax-pro/clients/:builderId/summary", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "accountant") { res.status(403).json({ error: "Forbidden" }); return; }

  const builderId = parseInt(String(req.params.builderId));
  const year = parseInt(req.query.year as string) || new Date().getFullYear();

  const builderIds = await getBuilderIds(user.id);
  if (!builderIds.includes(builderId)) { res.status(403).json({ error: "No access to this builder" }); return; }

  const projects = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(sql`created_by = ${builderId}`);

  const projectIds = projects.map((p) => p.id);

  if (projectIds.length === 0) {
    res.json({
      totalInvoiced: 0, totalCollected: 0, totalExpenses: 0,
      estimatedProfit: 0, marginPercent: 0,
      expensesByCategory: { materials: 0, labor: 0, equipment: 0, permits: 0, other: 0 },
      projectCount: 0, invoiceCount: 0, expenseCount: 0,
    });
    return;
  }

  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(
      and(
        inArray(invoicesTable.projectId, projectIds),
        sql`EXTRACT(YEAR FROM ${invoicesTable.createdAt}) = ${year}`
      )
    );

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(
      and(
        inArray(expensesTable.projectId, projectIds),
        sql`EXTRACT(YEAR FROM ${expensesTable.createdAt}) = ${year}`
      )
    );

  const totalInvoiced = invoices.reduce((s, i) => s + parseFloat(i.total as string), 0);
  const totalCollected = invoices.filter((i) => i.paidAt).reduce((s, i) => s + parseFloat(i.total as string), 0);
  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount as string), 0);
  const estimatedProfit = totalInvoiced - totalExpenses;
  const marginPercent = totalInvoiced > 0 ? Math.round((estimatedProfit / totalInvoiced) * 100) : 0;

  const expensesByCategory = expenses.reduce(
    (acc, e) => {
      const cat = e.category as string;
      if (cat in acc) acc[cat as keyof typeof acc] += parseFloat(e.amount as string);
      return acc;
    },
    { materials: 0, labor: 0, equipment: 0, permits: 0, other: 0 }
  );

  res.json({
    totalInvoiced, totalCollected, totalExpenses, estimatedProfit, marginPercent,
    expensesByCategory,
    projectCount: projects.length,
    invoiceCount: invoices.length,
    expenseCount: expenses.length,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tax-pro/clients/:builderId/expenses
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/tax-pro/clients/:builderId/expenses", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "accountant") { res.status(403).json({ error: "Forbidden" }); return; }

  const builderId = parseInt(String(req.params.builderId));
  const builderIds = await getBuilderIds(user.id);
  if (!builderIds.includes(builderId)) { res.status(403).json({ error: "No access" }); return; }

  const year = req.query.year ? parseInt(req.query.year as string) : null;
  const category = req.query.category as string | undefined;
  const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : null;

  const projects = await db
    .select({ id: projectsTable.id, name: projectsTable.name })
    .from(projectsTable)
    .where(sql`created_by = ${builderId}`);

  const projectIds = projects.map((p) => p.id);
  if (projectIds.length === 0) { res.json([]); return; }

  const conditions = [inArray(expensesTable.projectId, projectIds)];
  if (year) conditions.push(sql`EXTRACT(YEAR FROM ${expensesTable.createdAt}) = ${year}`);
  if (category) conditions.push(eq(expensesTable.category, category as any));
  if (projectId) conditions.push(eq(expensesTable.projectId, projectId));

  const rows = await db
    .select()
    .from(expensesTable)
    .where(and(...conditions))
    .orderBy(desc(expensesTable.expenseDate));

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  res.json(rows.map((e) => ({
    id: e.id,
    amount: parseFloat(e.amount as string),
    vendor: e.vendor,
    category: e.category,
    date: e.expenseDate,
    description: e.description,
    receiptUrl: e.receiptUrl,
    projectId: e.projectId,
    projectName: projectMap[e.projectId] ?? null,
  })));
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tax-pro/clients/:builderId/invoices
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/tax-pro/clients/:builderId/invoices", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "accountant") { res.status(403).json({ error: "Forbidden" }); return; }

  const builderId = parseInt(String(req.params.builderId));
  const builderIds = await getBuilderIds(user.id);
  if (!builderIds.includes(builderId)) { res.status(403).json({ error: "No access" }); return; }

  const year = req.query.year ? parseInt(req.query.year as string) : null;
  const status = req.query.status as string | undefined;

  const projects = await db
    .select({ id: projectsTable.id, name: projectsTable.name })
    .from(projectsTable)
    .where(sql`created_by = ${builderId}`);

  const projectIds = projects.map((p) => p.id);
  if (projectIds.length === 0) { res.json([]); return; }

  const conditions = [inArray(invoicesTable.projectId, projectIds)];
  if (year) conditions.push(sql`EXTRACT(YEAR FROM ${invoicesTable.createdAt}) = ${year}`);
  if (status) conditions.push(eq(invoicesTable.status, status));

  const rows = await db
    .select()
    .from(invoicesTable)
    .where(and(...conditions))
    .orderBy(desc(invoicesTable.createdAt));

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  res.json(rows.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    title: inv.title,
    total: parseFloat(inv.total as string),
    status: inv.status,
    paidAt: inv.paidAt,
    createdAt: inv.createdAt,
    projectId: inv.projectId,
    projectName: projectMap[inv.projectId] ?? null,
  })));
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tax-pro/clients/:builderId/vendors
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/tax-pro/clients/:builderId/vendors", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "accountant") { res.status(403).json({ error: "Forbidden" }); return; }

  const builderId = parseInt(String(req.params.builderId));
  const builderIds = await getBuilderIds(user.id);
  if (!builderIds.includes(builderId)) { res.status(403).json({ error: "No access" }); return; }

  const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

  const projects = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(sql`created_by = ${builderId}`);

  const projectIds = projects.map((p) => p.id);
  if (projectIds.length === 0) { res.json([]); return; }

  const vendors = await db
    .select()
    .from(projectVendorsTable)
    .where(inArray(projectVendorsTable.projectId, projectIds));

  const vendorMap = new Map<number, { vendor: typeof vendors[0]; totalPaid: number }>();
  for (const v of vendors) {
    if (!vendorMap.has(v.id)) {
      vendorMap.set(v.id, { vendor: v, totalPaid: parseFloat(v.contractAmount as string ?? "0") });
    }
  }

  res.json(
    Array.from(vendorMap.values()).map(({ vendor, totalPaid }) => ({
      id: vendor.id,
      name: vendor.name,
      company: vendor.company,
      email: vendor.email,
      totalPaid,
      w9Status: vendor.w9Url ? "on_file" : "missing",
      w9Url: vendor.w9Url,
      needs1099: totalPaid > 600,
    }))
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tax-pro/invite/:builderEmail
// ─────────────────────────────────────────────────────────────────────────────
router.post("/api/tax-pro/invite/:builderEmail", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "accountant") { res.status(403).json({ error: "Forbidden" }); return; }

  const builderEmail = decodeURIComponent(String(req.params.builderEmail));

  const [builder] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.email, builderEmail), eq(usersTable.role, "builder")));

  if (!builder) { res.status(404).json({ error: "Builder not found with that email" }); return; }

  const [existing] = await db
    .select()
    .from(taxProClientsTable)
    .where(and(eq(taxProClientsTable.taxProId, user.id), eq(taxProClientsTable.builderId, builder.id)));

  if (existing) { res.status(409).json({ error: "Invitation already sent" }); return; }

  const [connection] = await db
    .insert(taxProClientsTable)
    .values({ taxProId: user.id, builderId: builder.id, status: "pending" })
    .returning();

  const [taxProUser] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, user.id));
  const taxProName = taxProUser?.name ?? "Your accountant";

  try {
    const appUrl = process.env.APP_URL ?? "https://slably.app";
    const acceptUrl = `${appUrl}/tax-pro-accept?taxProId=${user.id}`;
    await getResend().emails.send({
      from: "Slably <hello@slably.app>",
      to: builder.email,
      subject: `${taxProName} is requesting access to your financial data`,
      html: `<p>Hi ${builder.name},</p>
<p><strong>${taxProName}</strong> (your tax preparer/accountant) is requesting read-only access to your Slably financial data for tax preparation purposes.</p>
<p><a href="${acceptUrl}" style="background:#1B3A5C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Accept Access</a></p>
<p>If you did not expect this invitation, you can safely ignore this email.</p>
<p>— The Slably Team</p>`,
    });
  } catch {
    // email failure is non-fatal
  }

  res.status(201).json(connection);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tax-pro/accept/:taxProId
// ─────────────────────────────────────────────────────────────────────────────
router.post("/api/tax-pro/accept/:taxProId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Only builders can accept" }); return; }

  const taxProId = parseInt(String(req.params.taxProId));

  const [conn] = await db
    .select()
    .from(taxProClientsTable)
    .where(and(eq(taxProClientsTable.taxProId, taxProId), eq(taxProClientsTable.builderId, user.id)));

  if (!conn) { res.status(404).json({ error: "Invitation not found" }); return; }

  const [updated] = await db
    .update(taxProClientsTable)
    .set({ status: "active", acceptedAt: new Date() })
    .where(eq(taxProClientsTable.id, conn.id))
    .returning();

  res.json(updated);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tax-pro/revoke/:taxProId
// ─────────────────────────────────────────────────────────────────────────────
router.post("/api/tax-pro/revoke/:taxProId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Only builders can revoke" }); return; }

  const taxProId = parseInt(String(req.params.taxProId));

  const [conn] = await db
    .select()
    .from(taxProClientsTable)
    .where(and(eq(taxProClientsTable.taxProId, taxProId), eq(taxProClientsTable.builderId, user.id)));

  if (!conn) { res.status(404).json({ error: "Connection not found" }); return; }

  const [updated] = await db
    .update(taxProClientsTable)
    .set({ status: "revoked" })
    .where(eq(taxProClientsTable.id, conn.id))
    .returning();

  res.json(updated);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tax-pro/my-tax-pro  (for builders to see their connected tax pro)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/tax-pro/my-tax-pro", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const [conn] = await db
    .select()
    .from(taxProClientsTable)
    .where(
      and(
        eq(taxProClientsTable.builderId, user.id),
        inArray(taxProClientsTable.status, ["pending", "active"])
      )
    )
    .orderBy(desc(taxProClientsTable.createdAt))
    .limit(1);

  if (!conn) { res.json(null); return; }

  const [taxPro] = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, conn.taxProId));

  res.json({ ...taxPro, status: conn.status, connectionId: conn.id });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tax-pro/vendors/:vendorId/request-w9
// ─────────────────────────────────────────────────────────────────────────────
router.post("/api/tax-pro/vendors/:vendorId/request-w9", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "accountant") { res.status(403).json({ error: "Forbidden" }); return; }

  const vendorId = parseInt(String(req.params.vendorId));

  const [vendor] = await db
    .select()
    .from(projectVendorsTable)
    .where(eq(projectVendorsTable.id, vendorId));

  if (!vendor) { res.status(404).json({ error: "Vendor not found" }); return; }
  if (!vendor.email) { res.status(400).json({ error: "Vendor has no email on file" }); return; }

  const builderIds = await getBuilderIds(user.id);
  const project = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, vendor.projectId), sql`created_by = ANY(ARRAY[${sql.join(builderIds.map(id => sql`${id}`), sql`, `)}])`))
    .limit(1);

  if (project.length === 0) { res.status(403).json({ error: "No access to this vendor" }); return; }

  const [builder] = await db
    .select({ name: usersTable.name })
    .from(projectsTable)
    .innerJoin(usersTable, sql`${usersTable.id} = projects.created_by`)
    .where(eq(projectsTable.id, vendor.projectId))
    .limit(1);

  const builderName = builder?.name ?? "Your contractor";

  try {
    await getResend().emails.send({
      from: "Slably <hello@slably.app>",
      to: vendor.email,
      subject: `W-9 Request from ${builderName}`,
      html: `<p>Hi ${vendor.name},</p>
<p><strong>${builderName}</strong> is requesting your W-9 for tax purposes. Please reply to this email with your completed W-9 form.</p>
<p>A W-9 is required for contractors who have received $600 or more in payments during the tax year.</p>
<p>Thank you,<br/>The Slably Team</p>`,
    });
  } catch {
    res.status(500).json({ error: "Failed to send email" });
    return;
  }

  res.json({ success: true, message: `W-9 request sent to ${vendor.name}` });
});

// ─── GET /api/tax-pro/public-profile/:userId (público, sin auth) ─────────────
router.get("/api/tax-pro/public-profile/:userId", async (req, res): Promise<void> => {
  const userId = parseInt(req.params.userId as string);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      serviceCity: usersTable.serviceCity,
      profilePhoto: usersTable.profilePhoto,
      organizationId: usersTable.organizationId,
    })
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.role, "accountant"), eq(usersTable.isActive, true)))
    .limit(1);

  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  let firmName: string | null = null;
  if (user.organizationId) {
    const [org] = await db
      .select({ name: organizationsTable.name })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, user.organizationId))
      .limit(1);
    firmName = org?.name ?? null;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    serviceCity: user.serviceCity,
    profilePhoto: user.profilePhoto,
    firmName,
  });
});

export default router;
