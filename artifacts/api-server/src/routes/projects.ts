import { Router, type IRouter } from "express";
import { eq, and, or } from "drizzle-orm";
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
import { requireAuth, type AuthRequest } from "../lib/auth";
import { logActivity } from "../lib/activity";

const router: IRouter = Router();

router.get("/projects", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;

  let projects;
  if (user.role === "builder") {
    projects = await db.select().from(projectsTable).where(eq(projectsTable.builderId, user.id));
  } else {
    projects = await db.select().from(projectsTable).where(eq(projectsTable.clientId, user.id));
  }

  res.json(ListProjectsResponse.parse(projects));
});

router.post("/projects", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "builder") {
    res.status(403).json({ error: "Only builders can create projects" });
    return;
  }

  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db.insert(projectsTable).values({
    ...parsed.data,
    builderId: user.id,
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

  const user = req.user!;
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (user.role === "builder" && project.builderId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (user.role === "client" && project.clientId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
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

  const [existing] = await db.select().from(projectsTable).where(
    and(eq(projectsTable.id, params.data.id), eq(projectsTable.builderId, user.id))
  );
  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== null && parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.clientName !== null && parsed.data.clientName !== undefined) updateData.clientName = parsed.data.clientName;
  if (parsed.data.clientEmail !== undefined) updateData.clientEmail = parsed.data.clientEmail;
  if (parsed.data.address !== null && parsed.data.address !== undefined) updateData.address = parsed.data.address;
  if (parsed.data.status !== null && parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.startDate !== undefined) updateData.startDate = parsed.data.startDate;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if (parsed.data.progress !== null && parsed.data.progress !== undefined) updateData.progress = parsed.data.progress;

  const [project] = await db.update(projectsTable)
    .set(updateData)
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  res.json(UpdateProjectResponse.parse(project));
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

  const [existing] = await db.select().from(projectsTable).where(
    and(eq(projectsTable.id, params.data.id), eq(projectsTable.builderId, user.id))
  );
  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
