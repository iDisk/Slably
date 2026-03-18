import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, photosTable } from "@workspace/db";
import {
  ListPhotosParams,
  ListPhotosResponse,
  CreatePhotoParams,
  CreatePhotoBody,
  UpdatePhotoParams,
  UpdatePhotoBody,
  UpdatePhotoResponse,
  DeletePhotoParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { checkProjectAccess } from "../lib/project-access.js";
import { logActivity } from "../lib/activity.js";

const router: IRouter = Router();

router.get("/projects/:projectId/photos", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ListPhotosParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  let photos = await db.select().from(photosTable)
    .where(eq(photosTable.projectId, params.data.projectId));

  if (user.role === "client") {
    photos = photos.filter(p => p.visibleToClient);
  }

  res.json(ListPhotosResponse.parse(photos));
});

router.post("/projects/:projectId/photos", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = CreatePhotoParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = CreatePhotoBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [photo] = await db.insert(photosTable).values({
    projectId: params.data.projectId,
    uploadedBy: user.id,
    fileUrl: parsed.data.fileUrl,
    caption: parsed.data.caption ?? null,
    visibleToClient: parsed.data.visibleToClient ?? false,
  }).returning();

  await logActivity(params.data.projectId, "photo_uploaded", `A photo was uploaded${photo.caption ? `: "${photo.caption}"` : ""}`, user.id);

  res.status(201).json(photo);
});

router.patch("/projects/:projectId/photos/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = UpdatePhotoParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = UpdatePhotoBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.caption !== undefined)    updateData.caption         = parsed.data.caption;
  if (parsed.data.visibleToClient != null)  updateData.visibleToClient = parsed.data.visibleToClient;

  const [photo] = await db.update(photosTable)
    .set(updateData)
    .where(and(eq(photosTable.id, params.data.id), eq(photosTable.projectId, params.data.projectId)))
    .returning();

  if (!photo) { res.status(404).json({ error: "Photo not found" }); return; }

  res.json(UpdatePhotoResponse.parse(photo));
});

router.delete("/projects/:projectId/photos/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DeletePhotoParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(params.data.projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  await db.delete(photosTable)
    .where(and(eq(photosTable.id, params.data.id), eq(photosTable.projectId, params.data.projectId)));

  res.sendStatus(204);
});

export default router;
