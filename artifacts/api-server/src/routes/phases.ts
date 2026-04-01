import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, projectPhasesTable, projectsTable } from "@workspace/db";
import {
  ListPhasesParams,
  BulkCreatePhasesParams,
  BulkCreatePhasesBody,
  UpdatePhaseParams,
  UpdatePhaseBody,
  UpdatePhaseIncludedBody,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { checkProjectAccess } from "../lib/project-access.js";

const router: IRouter = Router();

router.get("/projects/:id/phases", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ListPhasesParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const project = await checkProjectAccess(params.data.id, req.user!);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const phases = await db
    .select()
    .from(projectPhasesTable)
    .where(eq(projectPhasesTable.projectId, params.data.id))
    .orderBy(asc(projectPhasesTable.sortOrder));

  res.json(phases);
});

router.post("/projects/:id/phases/bulk", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = BulkCreatePhasesParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.id, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = BulkCreatePhasesBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const phases = await db.transaction(async (tx) => {
    await tx.delete(projectPhasesTable)
      .where(eq(projectPhasesTable.projectId, params.data.id));

    await tx.update(projectsTable)
      .set({ projectType: parsed.data.project_type })
      .where(eq(projectsTable.id, params.data.id));

    return tx.insert(projectPhasesTable)
      .values(
        parsed.data.phases.map((p) => ({
          projectId:    params.data.id,
          phaseTitle:   p.phase_title,
          activityText: p.activity_text,
          activityType: p.activity_type ?? null,
          included:     true,
          sortOrder:    p.sort_order,
        }))
      )
      .returning();
  });

  res.status(201).json(phases);
});

router.patch("/projects/:id/phases/:phaseId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = UpdatePhaseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.id, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = UpdatePhaseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [phase] = await db
    .update(projectPhasesTable)
    .set({ completed: parsed.data.completed })
    .where(and(
      eq(projectPhasesTable.id, params.data.phaseId),
      eq(projectPhasesTable.projectId, params.data.id)
    ))
    .returning();

  if (!phase) { res.status(404).json({ error: "Phase not found" }); return; }

  res.json(phase);
});

router.patch("/projects/:id/phases/:phaseId/included", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = UpdatePhaseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.id, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = UpdatePhaseIncludedBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [phase] = await db
    .update(projectPhasesTable)
    .set({ included: parsed.data.included })
    .where(and(
      eq(projectPhasesTable.id, params.data.phaseId),
      eq(projectPhasesTable.projectId, params.data.id)
    ))
    .returning();

  if (!phase) { res.status(404).json({ error: "Phase not found" }); return; }

  res.json(phase);
});

export default router;
