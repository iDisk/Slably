import { Router, type IRouter } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { eq, and, desc } from "drizzle-orm";
import { db, userPhotosTable, photosTable, usersTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { uploadBuffer } from "../lib/r2.js";
import { ShareUserPhotoBody, ApproveUserPhotoBody } from "@workspace/api-zod";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heic",
};

// ─── POST /api/user-photos ────────────────────────────────────────────────────
router.post(
  "/user-photos",
  requireAuth,
  upload.single("photo"),
  async (req: AuthRequest, res): Promise<void> => {
    const user = req.user!;
    if (user.role !== "subcontractor" && user.role !== "supplier") {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file received" }); return;
    }

    const ext = EXTENSION_MAP[req.file.mimetype];
    if (!ext) {
      res.status(400).json({ error: "Unsupported file type" }); return;
    }

    const key = `users/${user.id}/photos/${Date.now()}-${randomUUID()}.${ext}`;

    try {
      const fileUrl = await uploadBuffer(key, req.file.buffer, req.file.mimetype);
      const caption = typeof req.body.caption === "string" && req.body.caption.trim()
        ? req.body.caption.trim()
        : null;

      const [photo] = await db.insert(userPhotosTable).values({
        userId:            user.id,
        fileUrl,
        caption,
        sharedWithBuilder: false,
      }).returning();

      res.status(201).json(photo);
    } catch (err) {
      console.error("[R2] user-photo upload failed:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  },
);

// ─── GET /api/user-photos ─────────────────────────────────────────────────────
router.get("/user-photos", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  const photos = await db
    .select()
    .from(userPhotosTable)
    .where(eq(userPhotosTable.userId, user.id))
    .orderBy(desc(userPhotosTable.createdAt));
  res.json(photos);
});

// ─── PATCH /api/user-photos/:photoId/share ────────────────────────────────────
router.patch(
  "/user-photos/:photoId/share",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const user = req.user!;
    if (user.role !== "subcontractor" && user.role !== "supplier") {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const photoId = parseInt(req.params.photoId as string, 10);
    if (isNaN(photoId)) { res.status(400).json({ error: "Invalid photoId" }); return; }

    const parsed = ShareUserPhotoBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    const [existing] = await db
      .select()
      .from(userPhotosTable)
      .where(and(eq(userPhotosTable.id, photoId), eq(userPhotosTable.userId, user.id)));
    if (!existing) { res.status(404).json({ error: "Photo not found" }); return; }

    const [photo] = await db
      .update(userPhotosTable)
      .set({
        sharedWithBuilder: true,
        projectId:         parsed.data.project_id,
        approvalStatus:    "pending",
      })
      .where(eq(userPhotosTable.id, photoId))
      .returning();

    res.json(photo);
  },
);

// ─── GET /api/projects/:projectId/pending-photos ──────────────────────────────
router.get(
  "/projects/:projectId/pending-photos",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const user = req.user!;
    if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

    const projectId = parseInt(req.params.projectId as string, 10);
    if (isNaN(projectId)) { res.status(400).json({ error: "Invalid projectId" }); return; }

    const photos = await db
      .select({
        id:                userPhotosTable.id,
        userId:            userPhotosTable.userId,
        fileUrl:           userPhotosTable.fileUrl,
        caption:           userPhotosTable.caption,
        sharedWithBuilder: userPhotosTable.sharedWithBuilder,
        projectId:         userPhotosTable.projectId,
        approvalStatus:    userPhotosTable.approvalStatus,
        approvedBy:        userPhotosTable.approvedBy,
        approvedAt:        userPhotosTable.approvedAt,
        createdAt:         userPhotosTable.createdAt,
        uploaderName:      usersTable.name,
        uploaderEmail:     usersTable.email,
      })
      .from(userPhotosTable)
      .innerJoin(usersTable, eq(userPhotosTable.userId, usersTable.id))
      .where(and(
        eq(userPhotosTable.projectId,         projectId),
        eq(userPhotosTable.sharedWithBuilder, true),
        eq(userPhotosTable.approvalStatus,    "pending"),
      ))
      .orderBy(desc(userPhotosTable.createdAt));

    res.json(photos);
  },
);

// ─── PATCH /api/user-photos/:photoId/approve ─────────────────────────────────
router.patch(
  "/user-photos/:photoId/approve",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const user = req.user!;
    if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

    const photoId = parseInt(req.params.photoId as string, 10);
    if (isNaN(photoId)) { res.status(400).json({ error: "Invalid photoId" }); return; }

    const parsed = ApproveUserPhotoBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    const [existing] = await db
      .select()
      .from(userPhotosTable)
      .where(eq(userPhotosTable.id, photoId));
    if (!existing) { res.status(404).json({ error: "Photo not found" }); return; }

    if (parsed.data.status === "approved") {
      const [photo] = await db
        .update(userPhotosTable)
        .set({ approvalStatus: "approved", approvedBy: user.id, approvedAt: new Date() })
        .where(eq(userPhotosTable.id, photoId))
        .returning();

      await db.insert(photosTable).values({
        projectId:       existing.projectId!,
        fileUrl:         existing.fileUrl,
        caption:         existing.caption ?? undefined,
        uploadedBy:      existing.userId,
        visibleToClient: false,
      });

      res.json(photo);
    } else {
      const [photo] = await db
        .update(userPhotosTable)
        .set({ approvalStatus: "rejected" })
        .where(eq(userPhotosTable.id, photoId))
        .returning();

      res.json(photo);
    }
  },
);

export default router;
