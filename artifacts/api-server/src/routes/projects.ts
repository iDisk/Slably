import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import {
  CreateProjectBody,
  GetProjectParams,
  GetProjectResponse,
  UpdateProjectParams,
  UpdateProjectBody,
  UpdateProjectResponse,
  DeleteProjectParams,
  ListProjectsResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { checkProjectAccess } from "../lib/project-access.js";
import { logActivity } from "../lib/activity.js";
import { checkProjectLimit } from "../lib/gate-helpers.js";

const router: IRouter = Router();

router.get("/projects", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;

  // Subcontractors y suppliers → sus propios proyectos por builder_id
  if (user.role === "subcontractor" || user.role === "supplier") {
    const projects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.builderId, user.id))
      .orderBy(desc(projectsTable.createdAt));
    res.json(ListProjectsResponse.parse(projects));
    return;
  }

  // Clients y builders sin org → array vacío
  if (!user.organizationId) {
    res.json([]);
    return;
  }

  // Builders → todos los proyectos de su organización
  if (user.role === "builder") {
    const projects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.organizationId, user.organizationId));
    res.json(ListProjectsResponse.parse(projects));
    return;
  }

  // Clients → solo proyectos donde están asignados como clientId
  const projects = await db
    .select()
    .from(projectsTable)
    .where(
      and(
        eq(projectsTable.clientId, user.id),
        eq(projectsTable.organizationId, user.organizationId)
      )
    );
  res.json(ListProjectsResponse.parse(projects));
});

router.post("/projects", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "builder") {
    res.status(403).json({ error: "Only builders can create projects" });
    return;
  }
  if (!user.organizationId) {
    res.status(403).json({ error: "Builder must belong to an organization" });
    return;
  }

  if (!await checkProjectLimit(req, res)) return;

  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db.insert(projectsTable).values({
    ...parsed.data,
    builderId: user.id,
    organizationId: user.organizationId,
    progress: parsed.data.progress ?? 0,
  }).returning();

  await logActivity(project.id, "project_created", `Project "${project.name}" was created`, user.id);

  res.status(201).json(GetProjectResponse.parse(project));
});

router.get("/projects/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const project = await checkProjectAccess(params.data.id, req.user!);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(GetProjectResponse.parse(project));
});

router.patch("/projects/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const user = req.user!;
  if (user.role !== "builder") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const project = await checkProjectAccess(params.data.id, user);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name != null)         updateData.name         = parsed.data.name;
  if (parsed.data.clientName != null)   updateData.clientName   = parsed.data.clientName;
  if (parsed.data.clientEmail !== undefined) updateData.clientEmail = parsed.data.clientEmail;
  if (parsed.data.address != null)      updateData.address      = parsed.data.address;
  if (parsed.data.status != null)       updateData.status       = parsed.data.status;
  if (parsed.data.startDate !== undefined)   updateData.startDate   = parsed.data.startDate;
  if (parsed.data.notes !== undefined)  updateData.notes        = parsed.data.notes;
  if (parsed.data.progress != null)     updateData.progress     = parsed.data.progress;

  const [updated] = await db
    .update(projectsTable)
    .set(updateData)
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  res.json(UpdateProjectResponse.parse(updated));
});

router.delete("/projects/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const user = req.user!;
  if (user.role !== "builder") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const project = await checkProjectAccess(params.data.id, user);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
