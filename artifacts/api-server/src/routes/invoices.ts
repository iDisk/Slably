import { Router, type IRouter } from "express";
import { eq, and, or, desc, count, inArray } from "drizzle-orm";
import { db, invoicesTable, invoiceItemsTable, usersTable } from "@workspace/db";
import { InvoiceProjectParams, InvoiceParams, CreateInvoiceBody, UpdateInvoiceBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { checkProjectAccess } from "../lib/project-access.js";
import { sendInvoiceEmail } from "../lib/email.js";

const router: IRouter = Router();

// ── helper: fetch invoice with items + sender/recipient names ─────────────────
async function fetchInvoiceWithItems(invoiceId: number, projectId: number) {
  const sender    = db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable).as("sender");
  const recipient = db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable).as("recipient");

  const [row] = await db
    .select({
      invoice:        invoicesTable,
      senderName:     sender.name,
      senderEmail:    sender.email,
      recipientName:  recipient.name,
      recipientEmail: recipient.email,
    })
    .from(invoicesTable)
    .innerJoin(sender,    eq(invoicesTable.senderId,    sender.id))
    .innerJoin(recipient, eq(invoicesTable.recipientId, recipient.id))
    .where(and(eq(invoicesTable.id, invoiceId), eq(invoicesTable.projectId, projectId)));

  if (!row) return null;

  const items = await db
    .select()
    .from(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, invoiceId))
    .orderBy(invoiceItemsTable.sortOrder);

  return {
    ...row.invoice,
    senderName:    row.senderName,
    senderEmail:   row.senderEmail,
    recipientName: row.recipientName,
    recipientEmail: row.recipientEmail,
    items,
  };
}

// ── GET /api/projects/:projectId/invoices ─────────────────────────────────────
router.get("/projects/:projectId/invoices", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = InvoiceProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user    = req.user!;
  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const sender    = db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable).as("sender");
  const recipient = db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable).as("recipient");

  const invoices = await db
    .select({
      invoice:        invoicesTable,
      senderName:     sender.name,
      senderEmail:    sender.email,
      recipientName:  recipient.name,
      recipientEmail: recipient.email,
    })
    .from(invoicesTable)
    .innerJoin(sender,    eq(invoicesTable.senderId,    sender.id))
    .innerJoin(recipient, eq(invoicesTable.recipientId, recipient.id))
    .where(and(
      eq(invoicesTable.projectId, params.data.projectId),
      or(eq(invoicesTable.senderId, user.id), eq(invoicesTable.recipientId, user.id)),
    ))
    .orderBy(desc(invoicesTable.createdAt));

  if (invoices.length === 0) { res.json([]); return; }

  const invoiceIds = invoices.map(r => r.invoice.id);
  const allItems   = await db.select().from(invoiceItemsTable)
    .where(inArray(invoiceItemsTable.invoiceId, invoiceIds))
    .orderBy(invoiceItemsTable.sortOrder);

  const result = invoices.map(r => ({
    ...r.invoice,
    senderName:     r.senderName,
    senderEmail:    r.senderEmail,
    recipientName:  r.recipientName,
    recipientEmail: r.recipientEmail,
    items: allItems.filter(it => it.invoiceId === r.invoice.id),
  }));

  res.json(result);
});

// ── POST /api/projects/:projectId/invoices ────────────────────────────────────
router.post("/projects/:projectId/invoices", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = InvoiceProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder" && user.role !== "subcontractor") {
    res.status(403).json({ error: "Only builders and subcontractors can create invoices" }); return;
  }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { recipient_id, title, notes, due_date, items } = parsed.data;

  const itemsWithTotals = items.map((it, idx) => ({
    description: it.description,
    quantity:    String(it.quantity),
    unitPrice:   String(it.unit_price),
    total:       String(it.quantity * it.unit_price),
    sortOrder:   idx,
  }));
  const subtotal = itemsWithTotals.reduce((s, it) => s + parseFloat(it.total), 0);

  const [{ cnt }] = await db.select({ cnt: count() }).from(invoicesTable)
    .where(eq(invoicesTable.projectId, params.data.projectId));
  const invoiceNumber = `INV-${String(Number(cnt) + 1).padStart(3, "0")}`;

  const [invoice] = await db.insert(invoicesTable).values({
    projectId:      params.data.projectId,
    organizationId: user.organizationId!,
    senderId:       user.id,
    recipientId:    recipient_id,
    invoiceNumber,
    title,
    notes:    notes    ?? null,
    dueDate:  due_date ?? null,
    subtotal: String(subtotal),
    total:    String(subtotal),
    status:   "draft",
  }).returning();

  await db.insert(invoiceItemsTable).values(
    itemsWithTotals.map(it => ({ invoiceId: invoice.id, ...it }))
  );

  const full = await fetchInvoiceWithItems(invoice.id, params.data.projectId);
  res.status(201).json(full);
});

// ── GET /api/projects/:projectId/invoices/:invoiceId ──────────────────────────
router.get("/projects/:projectId/invoices/:invoiceId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = InvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user    = req.user!;
  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const full = await fetchInvoiceWithItems(params.data.invoiceId, params.data.projectId);
  if (!full) { res.status(404).json({ error: "Invoice not found" }); return; }

  if (full.senderId !== user.id && full.recipientId !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  res.json(full);
});

// ── PATCH /api/projects/:projectId/invoices/:invoiceId ────────────────────────
router.patch("/projects/:projectId/invoices/:invoiceId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = InvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user    = req.user!;
  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [existing] = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.id, params.data.invoiceId), eq(invoicesTable.projectId, params.data.projectId)));
  if (!existing)                   { res.status(404).json({ error: "Invoice not found" }); return; }
  if (existing.senderId !== user.id) { res.status(403).json({ error: "Only the sender can edit this invoice" }); return; }

  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const u: Record<string, unknown> = {};
  if (parsed.data.notes    !== undefined) u.notes   = parsed.data.notes;
  if (parsed.data.due_date !== undefined) u.dueDate = parsed.data.due_date;
  if (parsed.data.status   !== undefined) {
    u.status = parsed.data.status;
    if (parsed.data.status === "sent") u.sentAt = new Date();
    if (parsed.data.status === "paid") u.paidAt = new Date();
  }

  await db.update(invoicesTable).set(u)
    .where(and(eq(invoicesTable.id, params.data.invoiceId), eq(invoicesTable.projectId, params.data.projectId)));

  // Fire-and-forget email cuando status = 'sent'
  if (parsed.data.status === "sent") {
    void (async () => {
      try {
        const [recipient] = await db.select({ name: usersTable.name, email: usersTable.email })
          .from(usersTable).where(eq(usersTable.id, existing.recipientId));
        const [sender] = await db.select({ name: usersTable.name })
          .from(usersTable).where(eq(usersTable.id, existing.senderId));

        if (recipient?.email) {
          const appUrl     = process.env.APP_URL ?? "https://app.slably.com";
          const invoiceUrl = `${appUrl}/projects/${params.data.projectId}/invoices/${params.data.invoiceId}`;
          await sendInvoiceEmail({
            to:            recipient.email,
            recipientName: recipient.name,
            senderName:    sender?.name ?? "Your contractor",
            invoiceNumber: existing.invoiceNumber,
            invoiceTitle:  existing.title,
            totalAmount:   existing.total,
            dueDate:       existing.dueDate ?? (parsed.data.due_date ?? null),
            invoiceUrl,
          });
        }
      } catch (err) {
        console.error("[Invoice] Email notification failed:", err);
      }
    })();
  }

  const full = await fetchInvoiceWithItems(params.data.invoiceId, params.data.projectId);
  res.json(full);
});

// ── DELETE /api/projects/:projectId/invoices/:invoiceId ───────────────────────
router.delete("/projects/:projectId/invoices/:invoiceId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = InvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user    = req.user!;
  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [existing] = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.id, params.data.invoiceId), eq(invoicesTable.projectId, params.data.projectId)));
  if (!existing)                     { res.status(404).json({ error: "Invoice not found" }); return; }
  if (existing.senderId !== user.id)   { res.status(403).json({ error: "Only the sender can delete this invoice" }); return; }
  if (existing.status   !== "draft") { res.status(400).json({ error: "Only draft invoices can be deleted" }); return; }

  await db.delete(invoicesTable).where(eq(invoicesTable.id, params.data.invoiceId));
  res.sendStatus(204);
});

export default router;
