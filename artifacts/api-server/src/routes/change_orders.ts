import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, changeOrdersTable } from "@workspace/db";
import {
  ListChangeOrdersParams,
  ListChangeOrdersResponse,
  CreateChangeOrderParams,
  CreateChangeOrderBody,
  UpdateChangeOrderParams,
  UpdateChangeOrderBody,
  UpdateChangeOrderResponse,
  DeleteChangeOrderParams,
  ApproveChangeOrderParams,
  ApproveChangeOrderResponse,
  RejectChangeOrderParams,
  RejectChangeOrderResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { checkProjectAccess } from "../lib/project-access.js";
import { logActivity } from "../lib/activity.js";

const router: IRouter = Router();

function serializeCO(co: typeof changeOrdersTable.$inferSelect) {
  return { ...co, amount: Number(co.amount) };
}

router.get("/projects/:projectId/change-orders", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ListChangeOrdersParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const project = await checkProjectAccess(params.data.projectId, req.user!);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const changeOrders = await db.select().from(changeOrdersTable)
    .where(eq(changeOrdersTable.projectId, params.data.projectId));

  res.json(ListChangeOrdersResponse.parse(changeOrders.map(serializeCO)));
});

router.post("/projects/:projectId/change-orders", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = CreateChangeOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = CreateChangeOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [co] = await db.insert(changeOrdersTable).values({
    projectId: params.data.projectId,
    createdBy: user.id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    amount: String(parsed.data.amount),
    status: parsed.data.status,
  }).returning();

  await logActivity(params.data.projectId, "change_order_created", `Change order "${co.title}" was created`, user.id);

  res.status(201).json(serializeCO(co));
});

router.patch("/projects/:projectId/change-orders/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = UpdateChangeOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = UpdateChangeOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title != null)        updateData.title       = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.amount != null)       updateData.amount      = String(parsed.data.amount);
  if (parsed.data.status != null)       updateData.status      = parsed.data.status;

  const [co] = await db.update(changeOrdersTable)
    .set(updateData)
    .where(and(eq(changeOrdersTable.id, params.data.id), eq(changeOrdersTable.projectId, params.data.projectId)))
    .returning();

  if (!co) { res.status(404).json({ error: "Change order not found" }); return; }

  res.json(UpdateChangeOrderResponse.parse(serializeCO(co)));
});

router.delete("/projects/:projectId/change-orders/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DeleteChangeOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  await db.delete(changeOrdersTable)
    .where(and(eq(changeOrdersTable.id, params.data.id), eq(changeOrdersTable.projectId, params.data.projectId)));

  res.sendStatus(204);
});

router.post("/projects/:projectId/change-orders/:id/approve", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ApproveChangeOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [co] = await db.update(changeOrdersTable)
    .set({ status: "approved", approvedBy: user.id, approvedAt: new Date() })
    .where(and(eq(changeOrdersTable.id, params.data.id), eq(changeOrdersTable.projectId, params.data.projectId)))
    .returning();

  if (!co) { res.status(404).json({ error: "Change order not found" }); return; }

  await logActivity(params.data.projectId, "change_order_approved", `Change order "${co.title}" was approved`, user.id);

  res.json(ApproveChangeOrderResponse.parse(serializeCO(co)));
});

router.post("/projects/:projectId/change-orders/:id/reject", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = RejectChangeOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [co] = await db.update(changeOrdersTable)
    .set({ status: "rejected" })
    .where(and(eq(changeOrdersTable.id, params.data.id), eq(changeOrdersTable.projectId, params.data.projectId)))
    .returning();

  if (!co) { res.status(404).json({ error: "Change order not found" }); return; }

  await logActivity(params.data.projectId, "change_order_rejected", `Change order "${co.title}" was rejected`, user.id);

  res.json(RejectChangeOrderResponse.parse(serializeCO(co)));
});

export default router;
