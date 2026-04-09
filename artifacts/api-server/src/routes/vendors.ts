import { Router, type IRouter } from "express";
import { eq, and, desc, ne, count } from "drizzle-orm";
import { db, projectVendorsTable, vendorPaymentsTable, vendorChangeOrdersTable } from "@workspace/db";
import {
  VendorProjectParams,
  VendorParams,
  VendorPaymentParams,
  VendorChangeOrderParams,
  CreateVendorBody,
  UpdateVendorBody,
  CreateVendorPaymentBody,
  UpdateVendorPaymentBody,
  CreateVendorChangeOrderBody,
  UpdateVendorChangeOrderBody,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { checkProjectAccess } from "../lib/project-access.js";

const router: IRouter = Router();

// ── ALERTS (registrado antes que /:vendorId para evitar conflicto de routing) ─

router.get("/projects/:projectId/vendors/alerts", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = VendorProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const now = new Date();
  const today     = now.toISOString().split("T")[0];
  const in30Days  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const ago7Days  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);
  const ago14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [vendors, allPayments, allCOs] = await Promise.all([
    db.select().from(projectVendorsTable).where(and(
      eq(projectVendorsTable.projectId, params.data.projectId),
      eq(projectVendorsTable.status, "active"),
    )),
    db.select().from(vendorPaymentsTable).where(eq(vendorPaymentsTable.projectId, params.data.projectId)),
    db.select().from(vendorChangeOrdersTable).where(eq(vendorChangeOrdersTable.projectId, params.data.projectId)),
  ]);

  type Alert = {
    type: "overdue_payment" | "pending_change_order" | "coi_expiring" | "no_activity";
    vendor_id: number; vendor_name: string; message: string; severity: "high" | "medium" | "low";
  };
  const alerts: Alert[] = [];

  for (const v of vendors) {
    // overdue_payment
    const overdue = allPayments.filter(p =>
      p.vendorId === v.id && p.status === "pending" && p.dueDate != null && p.dueDate < today
    );
    if (overdue.length > 0) {
      alerts.push({ type: "overdue_payment", vendor_id: v.id, vendor_name: v.name,
        message: `${overdue.length} pago${overdue.length > 1 ? "s" : ""} vencido${overdue.length > 1 ? "s" : ""}`,
        severity: "high" });
    }

    // pending_change_order > 7 días
    const staleCOs = allCOs.filter(co =>
      co.vendorId === v.id && co.status === "pending" && co.createdAt < ago7Days
    );
    if (staleCOs.length > 0) {
      alerts.push({ type: "pending_change_order", vendor_id: v.id, vendor_name: v.name,
        message: `${staleCOs.length} change order${staleCOs.length > 1 ? "s" : ""} pendiente${staleCOs.length > 1 ? "s" : ""} sin respuesta`,
        severity: "medium" });
    }

    // coi_expiring dentro de 30 días
    if (v.coiExpiresAt != null && v.coiExpiresAt >= today && v.coiExpiresAt <= in30Days) {
      alerts.push({ type: "coi_expiring", vendor_id: v.id, vendor_name: v.name,
        message: `COI vence el ${v.coiExpiresAt}`, severity: "medium" });
    }

    // no_activity: sin pagos ni COs en 14+ días
    const vPayments = allPayments.filter(p => p.vendorId === v.id);
    const vCOs      = allCOs.filter(co => co.vendorId === v.id);
    const lastTs = Math.max(
      v.createdAt.getTime(),
      vPayments.length > 0 ? Math.max(...vPayments.map(p => p.createdAt.getTime())) : 0,
      vCOs.length > 0      ? Math.max(...vCOs.map(co => co.createdAt.getTime()))     : 0,
    );
    if (new Date(lastTs) < ago14Days) {
      alerts.push({ type: "no_activity", vendor_id: v.id, vendor_name: v.name,
        message: "Sin actividad en más de 14 días", severity: "low" });
    }
  }

  res.json(alerts);
});

// ── FREQUENT VENDORS ───────────────────────────────────────────────────────────

router.get("/projects/:projectId/vendors/frequent", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = VendorProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }
  if (!user.organizationId) { res.json([]); return; }

  const rows = await db
    .select({
      name:           projectVendorsTable.name,
      type:           projectVendorsTable.type,
      specialty:      projectVendorsTable.specialty,
      company:        projectVendorsTable.company,
      email:          projectVendorsTable.email,
      phone:          projectVendorsTable.phone,
      contract_notes: projectVendorsTable.contractNotes,
      linked_user_id: projectVendorsTable.linkedUserId,
      frequency:      count(),
    })
    .from(projectVendorsTable)
    .where(and(
      eq(projectVendorsTable.organizationId, user.organizationId),
      ne(projectVendorsTable.projectId, params.data.projectId),
      ne(projectVendorsTable.status, "cancelled"),
    ))
    .groupBy(
      projectVendorsTable.name,
      projectVendorsTable.type,
      projectVendorsTable.specialty,
      projectVendorsTable.company,
      projectVendorsTable.email,
      projectVendorsTable.phone,
      projectVendorsTable.contractNotes,
      projectVendorsTable.linkedUserId,
    )
    .orderBy(desc(count()))
    .limit(10);

  res.json(rows);
});

// ── VENDORS LIST / CREATE ──────────────────────────────────────────────────────

router.get("/projects/:projectId/vendors", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = VendorProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [vendors, allPayments, allCOs] = await Promise.all([
    db.select().from(projectVendorsTable)
      .where(eq(projectVendorsTable.projectId, params.data.projectId))
      .orderBy(desc(projectVendorsTable.createdAt)),
    db.select().from(vendorPaymentsTable).where(eq(vendorPaymentsTable.projectId, params.data.projectId)),
    db.select().from(vendorChangeOrdersTable).where(eq(vendorChangeOrdersTable.projectId, params.data.projectId)),
  ]);

  const result = vendors.map(v => {
    const payments_made = allPayments
      .filter(p => p.vendorId === v.id && p.status === "paid")
      .reduce((s, p) => s + parseFloat(p.amount), 0);
    const change_orders_total = allCOs
      .filter(co => co.vendorId === v.id && co.status === "approved")
      .reduce((s, co) => s + parseFloat(co.amount), 0);
    const contract_amount = v.contractAmount ? parseFloat(v.contractAmount) : 0;
    return { ...v, payments_made, change_orders_total, balance_pending: contract_amount + change_orders_total - payments_made };
  });

  res.json(result);
});

router.post("/projects/:projectId/vendors", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = VendorProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = CreateVendorBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [vendor] = await db.insert(projectVendorsTable).values({
    projectId:      params.data.projectId,
    organizationId: user.organizationId!,
    createdBy:      user.id,
    name:           parsed.data.name,
    type:           parsed.data.type,
    company:        parsed.data.company         ?? null,
    email:          parsed.data.email           ?? null,
    phone:          parsed.data.phone           ?? null,
    specialty:      parsed.data.specialty       ?? null,
    contractAmount: parsed.data.contract_amount != null ? String(parsed.data.contract_amount) : null,
    contractNotes:  parsed.data.contract_notes  ?? null,
    linkedUserId:   parsed.data.linked_user_id  ?? null,
  }).returning();

  res.status(201).json(vendor);
});

// ── VENDORS PATCH / DELETE ─────────────────────────────────────────────────────

router.patch("/projects/:projectId/vendors/:vendorId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = VendorParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = UpdateVendorBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const u: Record<string, unknown> = {};
  if (parsed.data.name            !== undefined) u.name           = parsed.data.name;
  if (parsed.data.type            !== undefined) u.type           = parsed.data.type;
  if (parsed.data.company         !== undefined) u.company        = parsed.data.company;
  if (parsed.data.email           !== undefined) u.email          = parsed.data.email;
  if (parsed.data.phone           !== undefined) u.phone          = parsed.data.phone;
  if (parsed.data.specialty       !== undefined) u.specialty      = parsed.data.specialty;
  if (parsed.data.contract_amount !== undefined) u.contractAmount = parsed.data.contract_amount != null ? String(parsed.data.contract_amount) : null;
  if (parsed.data.contract_notes  !== undefined) u.contractNotes  = parsed.data.contract_notes;
  if (parsed.data.linked_user_id  !== undefined) u.linkedUserId   = parsed.data.linked_user_id;
  if (parsed.data.status          !== undefined) u.status         = parsed.data.status;
  if (parsed.data.w9_url          !== undefined) u.w9Url          = parsed.data.w9_url;
  if (parsed.data.coi_url         !== undefined) u.coiUrl         = parsed.data.coi_url;
  if (parsed.data.coi_expires_at  !== undefined) u.coiExpiresAt   = parsed.data.coi_expires_at;

  const [vendor] = await db.update(projectVendorsTable).set(u)
    .where(and(eq(projectVendorsTable.id, params.data.vendorId), eq(projectVendorsTable.projectId, params.data.projectId)))
    .returning();
  if (!vendor) { res.status(404).json({ error: "Vendor not found" }); return; }
  res.json(vendor);
});

router.delete("/projects/:projectId/vendors/:vendorId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = VendorParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [vendor] = await db.update(projectVendorsTable).set({ status: "cancelled" })
    .where(and(eq(projectVendorsTable.id, params.data.vendorId), eq(projectVendorsTable.projectId, params.data.projectId)))
    .returning();
  if (!vendor) { res.status(404).json({ error: "Vendor not found" }); return; }
  res.sendStatus(204);
});

// ── PAYMENTS ───────────────────────────────────────────────────────────────────

router.get("/projects/:projectId/vendors/:vendorId/payments", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = VendorParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  if (req.user!.role === "client") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, req.user!);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const payments = await db.select().from(vendorPaymentsTable)
    .where(and(eq(vendorPaymentsTable.vendorId, params.data.vendorId), eq(vendorPaymentsTable.projectId, params.data.projectId)))
    .orderBy(desc(vendorPaymentsTable.createdAt));
  res.json(payments);
});

router.post("/projects/:projectId/vendors/:vendorId/payments", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = VendorParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = CreateVendorPaymentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const isPaid = parsed.data.status === "paid";
  const [payment] = await db.insert(vendorPaymentsTable).values({
    vendorId:      params.data.vendorId,
    projectId:     params.data.projectId,
    createdBy:     user.id,
    description:   parsed.data.description,
    amount:        String(parsed.data.amount),
    paymentType:   parsed.data.payment_type,
    status:        parsed.data.status         ?? "pending",
    dueDate:       parsed.data.due_date       ?? null,
    paidAt:        isPaid ? new Date()        : null,
    paymentMethod: parsed.data.payment_method ?? null,
    notes:         parsed.data.notes          ?? null,
  }).returning();
  res.status(201).json(payment);
});

router.patch("/projects/:projectId/vendors/:vendorId/payments/:paymentId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = VendorPaymentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = UpdateVendorPaymentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const u: Record<string, unknown> = {};
  if (parsed.data.description    !== undefined) u.description   = parsed.data.description;
  if (parsed.data.amount         !== undefined) u.amount        = String(parsed.data.amount);
  if (parsed.data.payment_type   !== undefined) u.paymentType   = parsed.data.payment_type;
  if (parsed.data.due_date       !== undefined) u.dueDate       = parsed.data.due_date;
  if (parsed.data.payment_method !== undefined) u.paymentMethod = parsed.data.payment_method;
  if (parsed.data.receipt_url    !== undefined) u.receiptUrl    = parsed.data.receipt_url;
  if (parsed.data.notes          !== undefined) u.notes         = parsed.data.notes;
  if (parsed.data.status !== undefined) {
    u.status = parsed.data.status;
    if (parsed.data.status === "paid") u.paidAt = new Date();
  }

  const [payment] = await db.update(vendorPaymentsTable).set(u)
    .where(and(
      eq(vendorPaymentsTable.id, params.data.paymentId),
      eq(vendorPaymentsTable.vendorId, params.data.vendorId),
      eq(vendorPaymentsTable.projectId, params.data.projectId),
    ))
    .returning();
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }
  res.json(payment);
});

router.delete("/projects/:projectId/vendors/:vendorId/payments/:paymentId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = VendorPaymentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [deleted] = await db.delete(vendorPaymentsTable)
    .where(and(
      eq(vendorPaymentsTable.id, params.data.paymentId),
      eq(vendorPaymentsTable.vendorId, params.data.vendorId),
      eq(vendorPaymentsTable.projectId, params.data.projectId),
    ))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Payment not found" }); return; }
  res.sendStatus(204);
});

// ── CHANGE ORDERS ──────────────────────────────────────────────────────────────

router.get("/projects/:projectId/vendors/:vendorId/change-orders", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = VendorParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const project = await checkProjectAccess(params.data.projectId, req.user!);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const cos = await db.select().from(vendorChangeOrdersTable)
    .where(and(eq(vendorChangeOrdersTable.vendorId, params.data.vendorId), eq(vendorChangeOrdersTable.projectId, params.data.projectId)))
    .orderBy(vendorChangeOrdersTable.number);
  res.json(cos);
});

router.post("/projects/:projectId/vendors/:vendorId/change-orders", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = VendorParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = CreateVendorChangeOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  let number = parsed.data.number;
  if (number == null) {
    const last = await db.select({ number: vendorChangeOrdersTable.number })
      .from(vendorChangeOrdersTable)
      .where(eq(vendorChangeOrdersTable.vendorId, params.data.vendorId))
      .orderBy(desc(vendorChangeOrdersTable.number))
      .limit(1);
    number = last.length > 0 ? last[0].number + 1 : 1;
  }

  const [co] = await db.insert(vendorChangeOrdersTable).values({
    vendorId:    params.data.vendorId,
    projectId:   params.data.projectId,
    createdBy:   user.id,
    number,
    title:       parsed.data.title,
    amount:      String(parsed.data.amount),
    description: parsed.data.description ?? null,
  }).returning();
  res.status(201).json(co);
});

router.patch("/projects/:projectId/vendors/:vendorId/change-orders/:coId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = VendorChangeOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = UpdateVendorChangeOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const u: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "approved") u.approvedAt = new Date();

  const [co] = await db.update(vendorChangeOrdersTable).set(u)
    .where(and(
      eq(vendorChangeOrdersTable.id, params.data.coId),
      eq(vendorChangeOrdersTable.vendorId, params.data.vendorId),
      eq(vendorChangeOrdersTable.projectId, params.data.projectId),
    ))
    .returning();
  if (!co) { res.status(404).json({ error: "Change order not found" }); return; }
  res.json(co);
});

// ── LEDGER ─────────────────────────────────────────────────────────────────────

router.get("/projects/:projectId/vendors/:vendorId/ledger", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = VendorParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const project = await checkProjectAccess(params.data.projectId, req.user!);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [vendor] = await db.select().from(projectVendorsTable)
    .where(and(eq(projectVendorsTable.id, params.data.vendorId), eq(projectVendorsTable.projectId, params.data.projectId)))
    .limit(1);
  if (!vendor) { res.status(404).json({ error: "Vendor not found" }); return; }

  const [approvedCOs, paidPayments] = await Promise.all([
    db.select().from(vendorChangeOrdersTable)
      .where(and(eq(vendorChangeOrdersTable.vendorId, params.data.vendorId), eq(vendorChangeOrdersTable.status, "approved")))
      .orderBy(vendorChangeOrdersTable.createdAt),
    db.select().from(vendorPaymentsTable)
      .where(and(eq(vendorPaymentsTable.vendorId, params.data.vendorId), eq(vendorPaymentsTable.status, "paid")))
      .orderBy(vendorPaymentsTable.createdAt),
  ]);

  const contract_amount     = vendor.contractAmount ? parseFloat(vendor.contractAmount) : 0;
  const change_orders_total = approvedCOs.reduce((s, co) => s + parseFloat(co.amount), 0);
  const payments_made       = paidPayments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const adjusted_contract   = contract_amount + change_orders_total;
  const balance_pending     = adjusted_contract - payments_made;

  type Tx = { date: string; type: "contract"|"change_order"|"payment"; description: string; amount: number; running_balance: number };
  const transactions: Tx[] = [];

  if (contract_amount > 0) {
    transactions.push({ date: vendor.createdAt.toISOString(), type: "contract",
      description: `Contrato original — ${vendor.name}`, amount: contract_amount, running_balance: 0 });
  }
  for (const co of approvedCOs) {
    transactions.push({ date: co.createdAt.toISOString(), type: "change_order",
      description: `CO #${co.number} — ${co.title}`, amount: parseFloat(co.amount), running_balance: 0 });
  }
  for (const p of paidPayments) {
    transactions.push({ date: (p.paidAt ?? p.createdAt).toISOString(), type: "payment",
      description: p.description, amount: -parseFloat(p.amount), running_balance: 0 });
  }

  transactions.sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  for (const tx of transactions) { running += tx.amount; tx.running_balance = running; }

  res.json({ contract_amount, change_orders_total, adjusted_contract, payments_made, balance_pending, transactions });
});

export default router;
