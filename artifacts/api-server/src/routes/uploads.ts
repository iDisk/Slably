import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { PresignedUrlBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { checkProjectAccess } from "../lib/project-access.js";
import { getPresignedUploadUrl, getPublicUrl } from "../lib/r2.js";

const router: IRouter = Router();

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

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

export default router;
