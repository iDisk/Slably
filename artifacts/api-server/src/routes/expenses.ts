import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, expensesTable } from "@workspace/db";
import multer from "multer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import path from "path";
import {
  ListExpensesParams,
  CreateExpenseParams,
  CreateExpenseBody,
  UpdateExpenseParams,
  UpdateExpenseBody,
  DeleteExpenseParams,
  CreateExpenseFromReceiptParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { checkProjectAccess } from "../lib/project-access.js";
import { logActivity } from "../lib/activity.js";
import { r2Client, getPublicUrl } from "../lib/r2.js";
import { extractReceiptData } from "../lib/openai.js";

const upload = multer({ storage: multer.memoryStorage() });

const RECEIPT_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

const router: IRouter = Router();

router.get("/projects/:projectId/expenses", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ListExpensesParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  if (req.user!.role === "client") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, req.user!);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.projectId, params.data.projectId))
    .orderBy(desc(expensesTable.expenseDate));

  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  res.json({ expenses, total });
});

router.post("/projects/:projectId/expenses", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = CreateExpenseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [expense] = await db.insert(expensesTable).values({
    projectId:     params.data.projectId,
    createdBy:     user.id,
    amount:        String(parsed.data.amount),
    vendor:        parsed.data.vendor,
    category:      parsed.data.category,
    expenseDate:   parsed.data.expense_date,
    description:   parsed.data.description ?? null,
    receiptUrl:    parsed.data.receipt_url ?? null,
    paymentMethod: parsed.data.payment_method ?? null,
  }).returning();

  const formatted = `$${parseFloat(expense.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  await logActivity(params.data.projectId, "expense_recorded", `Expense recorded: ${formatted} from ${expense.vendor}`, user.id);

  res.status(201).json(expense);
});

router.patch("/projects/:projectId/expenses/:eid", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = UpdateExpenseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = UpdateExpenseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.amount      !== undefined) updateData.amount        = String(parsed.data.amount);
  if (parsed.data.vendor      !== undefined) updateData.vendor        = parsed.data.vendor;
  if (parsed.data.category    !== undefined) updateData.category      = parsed.data.category;
  if (parsed.data.expense_date !== undefined) updateData.expenseDate  = parsed.data.expense_date;
  if (parsed.data.description !== undefined) updateData.description   = parsed.data.description;
  if (parsed.data.receipt_url !== undefined) updateData.receiptUrl    = parsed.data.receipt_url;
  if (parsed.data.payment_method !== undefined) updateData.paymentMethod = parsed.data.payment_method;
  if (parsed.data.approved    !== undefined) updateData.approved      = parsed.data.approved;

  const [expense] = await db
    .update(expensesTable)
    .set(updateData)
    .where(and(eq(expensesTable.id, params.data.eid), eq(expensesTable.projectId, params.data.projectId)))
    .returning();

  if (!expense) { res.status(404).json({ error: "Expense not found" }); return; }

  res.json(expense);
});

router.delete("/projects/:projectId/expenses/:eid", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DeleteExpenseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [deleted] = await db
    .delete(expensesTable)
    .where(and(eq(expensesTable.id, params.data.eid), eq(expensesTable.projectId, params.data.projectId)))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Expense not found" }); return; }

  res.sendStatus(204);
});

router.post(
  "/projects/:projectId/expenses/from-receipt",
  requireAuth,
  upload.single("receipt"),
  async (req: AuthRequest, res): Promise<void> => {
    const params = CreateExpenseFromReceiptParams.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

    const user = req.user!;
    if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

    const project = await checkProjectAccess(params.data.projectId, user);
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }

    if (!req.file) { res.status(400).json({ error: "No se recibió ninguna imagen" }); return; }

    const mimeType = req.file.mimetype;
    if (!RECEIPT_MIME_TYPES[mimeType]) {
      res.status(400).json({ error: "Tipo de archivo no permitido. Use JPEG, PNG, WebP o HEIC." });
      return;
    }

    const ext = RECEIPT_MIME_TYPES[mimeType];
    const r2Key = `projects/${params.data.projectId}/expenses/receipts/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

    try {
      await r2Client.send(new PutObjectCommand({
        Bucket:      process.env.R2_BUCKET_NAME!,
        Key:         r2Key,
        Body:        req.file.buffer,
        ContentType: mimeType,
      }));
    } catch (err) {
      console.error("[R2] Receipt upload failed:", err);
      res.status(500).json({ error: "Error al subir la imagen" });
      return;
    }
    const receiptUrl = getPublicUrl(r2Key);

    let ocrResult: Awaited<ReturnType<typeof extractReceiptData>>;
    try {
      ocrResult = await extractReceiptData(req.file.buffer, mimeType);
    } catch (err) {
      console.error("[OpenAI] Receipt OCR failed:", err);
      res.status(500).json({ error: "Error al procesar el recibo con IA" });
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    const [expense] = await db.insert(expensesTable).values({
      projectId:     params.data.projectId,
      createdBy:     user.id,
      amount:        String(ocrResult.amount ?? 0),
      vendor:        ocrResult.vendor          ?? "Sin proveedor",
      description:   ocrResult.description     ?? null,
      category:      ocrResult.category        ?? "other",
      expenseDate:   ocrResult.date            ?? today,
      paymentMethod: ocrResult.payment_method  ?? null,
      receiptUrl,
      ocrRaw:        ocrResult,
      ocrConfidence: ocrResult.confidence,
      approved:      false,
    }).returning();

    const formatted = `$${parseFloat(expense.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    await logActivity(
      params.data.projectId,
      "expense_recorded",
      `Expense from receipt: ${formatted} from ${expense.vendor} (OCR ${ocrResult.confidence}%)`,
      user.id,
    );

    res.status(201).json({ ...expense, ocr_result: ocrResult });
  },
);

export default router;
