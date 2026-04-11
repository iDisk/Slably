import { Router, type IRouter } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { PresignedUrlBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { checkProjectAccess } from "../lib/project-access.js";
import { getPresignedUploadUrl, getPublicUrl, uploadBuffer } from "../lib/r2.js";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heic",
};

// ─── POST /api/uploads/presigned-url ─────────────────────────────────────────

router.post("/presigned-url", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;

  const parsed = PresignedUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { fileName, contentType, projectId } = parsed.data;

  const project = await checkProjectAccess(projectId, user);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (user.role !== "builder") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const ext = EXTENSION_MAP[contentType];
  const key = `photos/${projectId}/${Date.now()}-${randomUUID()}.${ext}`;

  try {
    const presignedUrl = await getPresignedUploadUrl(key, contentType);
    const publicUrl    = getPublicUrl(key);
    res.json({ presignedUrl, publicUrl, key });
  } catch (err) {
    console.error("[R2] Failed to generate presigned URL:", err);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

// ─── POST /api/uploads/profile-photo ─────────────────────────────────────────

router.post(
  "/profile-photo",
  requireAuth,
  upload.single("photo"),
  async (req: AuthRequest, res): Promise<void> => {
    const user = req.user!;

    if (!req.file) {
      res.status(400).json({ error: "No se recibió ningún archivo" });
      return;
    }

    const ext = EXTENSION_MAP[req.file.mimetype];
    if (!ext) {
      res.status(400).json({ error: "Tipo de archivo no soportado" });
      return;
    }

    const key = `users/${user.id}/profile-photo.${ext}`;
    try {
      const url = await uploadBuffer(key, req.file.buffer, req.file.mimetype);
      await db.update(usersTable).set({ profilePhoto: url }).where(eq(usersTable.id, user.id));
      res.json({ profilePhoto: url });
    } catch (err) {
      console.error("[R2] profile-photo upload failed:", err);
      res.status(500).json({ error: "Error al subir la imagen" });
    }
  },
);

// ─── POST /api/uploads/company-logo ──────────────────────────────────────────

router.post(
  "/company-logo",
  requireAuth,
  upload.single("logo"),
  async (req: AuthRequest, res): Promise<void> => {
    const user = req.user!;

    if (user.role === "client") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No se recibió ningún archivo" });
      return;
    }

    const ext = EXTENSION_MAP[req.file.mimetype];
    if (!ext) {
      res.status(400).json({ error: "Tipo de archivo no soportado" });
      return;
    }

    const key = `users/${user.id}/company-logo.${ext}`;
    try {
      const url = await uploadBuffer(key, req.file.buffer, req.file.mimetype);
      await db.update(usersTable).set({ companyLogo: url }).where(eq(usersTable.id, user.id));
      res.json({ companyLogo: url });
    } catch (err) {
      console.error("[R2] company-logo upload failed:", err);
      res.status(500).json({ error: "Error al subir el logo" });
    }
  },
);

export default router;
