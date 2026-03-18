import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, contractsTable } from "@workspace/db";
import {
  ListContractsParams,
  ListContractsResponse,
  CreateContractParams,
  CreateContractBody,
  UpdateContractParams,
  UpdateContractBody,
  UpdateContractResponse,
  DeleteContractParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { checkProjectAccess } from "../lib/project-access.js";
import { logActivity } from "../lib/activity.js";

const router: IRouter = Router();

router.get("/projects/:projectId/contracts", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ListContractsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const project = await checkProjectAccess(params.data.projectId, req.user!);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const contracts = await db.select().from(contractsTable)
    .where(eq(contractsTable.projectId, params.data.projectId));

  res.json(ListContractsResponse.parse(contracts));
});

router.post("/projects/:projectId/contracts", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = CreateContractParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = CreateContractBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [contract] = await db.insert(contractsTable).values({
    projectId: params.data.projectId,
    ...parsed.data,
  }).returning();

  await logActivity(params.data.projectId, "contract_uploaded", `Contract "${contract.title}" was uploaded`, user.id);

  res.status(201).json(contract);
});

router.patch("/projects/:projectId/contracts/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = UpdateContractParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = UpdateContractBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title != null)   updateData.title   = parsed.data.title;
  if (parsed.data.fileUrl !== undefined)  updateData.fileUrl  = parsed.data.fileUrl;
  if (parsed.data.version !== undefined)  updateData.version  = parsed.data.version;
  if (parsed.data.status != null)  updateData.status  = parsed.data.status;

  const [contract] = await db.update(contractsTable)
    .set(updateData)
    .where(and(eq(contractsTable.id, params.data.id), eq(contractsTable.projectId, params.data.projectId)))
    .returning();

  if (!contract) { res.status(404).json({ error: "Contract not found" }); return; }

  if (parsed.data.status === "signed") {
    await logActivity(params.data.projectId, "contract_signed", `Contract "${contract.title}" was marked as signed`, user.id);
  }

  res.json(UpdateContractResponse.parse(contract));
});

router.delete("/projects/:projectId/contracts/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DeleteContractParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  await db.delete(contractsTable)
    .where(and(eq(contractsTable.id, params.data.id), eq(contractsTable.projectId, params.data.projectId)));

  res.sendStatus(204);
});

export default router;
