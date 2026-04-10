import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, dailyLogsTable, projectVendorsTable, projectsTable } from "@workspace/db";
import multer from "multer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import {
  DailyLogParams,
  DailyLogIdParams,
  CreateDailyLogBody,
  UpdateDailyLogBody,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { checkProjectAccess } from "../lib/project-access.js";
import { r2Client, getPublicUrl } from "../lib/r2.js";
import { transcribeAudio, structureDailyLog } from "../lib/openai.js";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

const AUDIO_MIME_TYPES: Record<string, string> = {
  "audio/mpeg":  "mp3",
  "audio/mp4":   "mp4",
  "audio/wav":   "wav",
  "audio/wave":  "wav",
  "audio/x-wav": "wav",
  "audio/x-m4a": "m4a",
  "audio/webm":  "webm",
  "video/mp4":   "mp4",
  "video/webm":  "webm",
};

// Helper: verify the user is a vendor of the project
async function isVendorOfProject(projectId: number, userId: number): Promise<boolean> {
  const [vendor] = await db
    .select({ id: projectVendorsTable.id })
    .from(projectVendorsTable)
    .where(and(
      eq(projectVendorsTable.projectId, projectId),
      eq(projectVendorsTable.linkedUserId, userId),
    ));
  return !!vendor;
}

const isSub = (role: string) => role === "subcontractor" || role === "supplier";

// GET /api/projects/:id/daily-logs
router.get("/projects/:id/daily-logs", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DailyLogParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;

  if (user.role === "client") { res.status(403).json({ error: "Forbidden" }); return; }

  // Sub/supplier: verify vendor → return only own logs (no audioUrl / transcription)
  if (isSub(user.role)) {
    const ok = await isVendorOfProject(params.data.id, user.id);
    if (!ok) { res.status(403).json({ error: "Forbidden" }); return; }

    const logs = await db
      .select({
        id:             dailyLogsTable.id,
        projectId:      dailyLogsTable.projectId,
        organizationId: dailyLogsTable.organizationId,
        createdBy:      dailyLogsTable.createdBy,
        logDate:        dailyLogsTable.logDate,
        weather:        dailyLogsTable.weather,
        temperature:    dailyLogsTable.temperature,
        workersCount:   dailyLogsTable.workersCount,
        activities:     dailyLogsTable.activities,
        materials:      dailyLogsTable.materials,
        problems:       dailyLogsTable.problems,
        notes:          dailyLogsTable.notes,
        aiProcessed:    dailyLogsTable.aiProcessed,
        status:         dailyLogsTable.status,
        createdAt:      dailyLogsTable.createdAt,
        updatedAt:      dailyLogsTable.updatedAt,
      })
      .from(dailyLogsTable)
      .where(and(
        eq(dailyLogsTable.projectId, params.data.id),
        eq(dailyLogsTable.createdBy, user.id),
      ))
      .orderBy(desc(dailyLogsTable.logDate));

    res.json(logs);
    return;
  }

  // Builder: full access
  const project = await checkProjectAccess(params.data.id, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const logs = await db
    .select({
      id:              dailyLogsTable.id,
      projectId:       dailyLogsTable.projectId,
      organizationId:  dailyLogsTable.organizationId,
      createdBy:       dailyLogsTable.createdBy,
      logDate:         dailyLogsTable.logDate,
      weather:         dailyLogsTable.weather,
      temperature:     dailyLogsTable.temperature,
      workersCount:    dailyLogsTable.workersCount,
      activities:      dailyLogsTable.activities,
      materials:       dailyLogsTable.materials,
      problems:        dailyLogsTable.problems,
      notes:           dailyLogsTable.notes,
      audioUrl:        dailyLogsTable.audioUrl,
      aiProcessed:     dailyLogsTable.aiProcessed,
      status:          dailyLogsTable.status,
      shareWithClient: dailyLogsTable.shareWithClient,
      createdAt:       dailyLogsTable.createdAt,
      updatedAt:       dailyLogsTable.updatedAt,
    })
    .from(dailyLogsTable)
    .where(eq(dailyLogsTable.projectId, params.data.id))
    .orderBy(desc(dailyLogsTable.logDate));

  res.json(logs);
});

// POST /api/projects/:id/daily-logs
router.post("/projects/:id/daily-logs", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DailyLogParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;

  if (user.role === "client") { res.status(403).json({ error: "Forbidden" }); return; }

  let projectOrgId: number;
  if (isSub(user.role)) {
    const ok = await isVendorOfProject(params.data.id, user.id);
    if (!ok) { res.status(403).json({ error: "Forbidden" }); return; }
    const [proj] = await db
      .select({ organizationId: projectsTable.organizationId })
      .from(projectsTable)
      .where(eq(projectsTable.id, params.data.id));
    if (!proj) { res.status(404).json({ error: "Project not found" }); return; }
    projectOrgId = proj.organizationId;
  } else {
    const project = await checkProjectAccess(params.data.id, user);
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
    projectOrgId = project.organizationId;
  }

  const parsed = CreateDailyLogBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const conflictWhere = isSub(user.role)
    ? and(
        eq(dailyLogsTable.projectId, params.data.id),
        eq(dailyLogsTable.logDate, parsed.data.log_date),
        eq(dailyLogsTable.createdBy, user.id),
      )
    : and(
        eq(dailyLogsTable.projectId, params.data.id),
        eq(dailyLogsTable.logDate, parsed.data.log_date),
      );

  const [existing] = await db
    .select({ id: dailyLogsTable.id, status: dailyLogsTable.status })
    .from(dailyLogsTable)
    .where(conflictWhere);

  if (existing?.status === "confirmed") {
    res.status(409).json({ error: "Ya existe un log confirmado para esta fecha. No se puede sobreescribir." });
    return;
  }

  let log;
  if (existing) {
    [log] = await db.update(dailyLogsTable).set({
      weather:      parsed.data.weather       ?? null,
      temperature:  parsed.data.temperature   ?? null,
      workersCount: parsed.data.workers_count ?? null,
      activities:   parsed.data.activities,
      materials:    parsed.data.materials     ?? null,
      problems:     parsed.data.problems      ?? null,
      notes:        parsed.data.notes         ?? null,
      aiProcessed:  false,
      status:       "draft",
    }).where(eq(dailyLogsTable.id, existing.id)).returning();
  } else {
    [log] = await db.insert(dailyLogsTable).values({
      projectId:      params.data.id,
      organizationId: projectOrgId,
      createdBy:      user.id,
      logDate:        parsed.data.log_date,
      weather:        parsed.data.weather       ?? null,
      temperature:    parsed.data.temperature   ?? null,
      workersCount:   parsed.data.workers_count ?? null,
      activities:     parsed.data.activities,
      materials:      parsed.data.materials     ?? null,
      problems:       parsed.data.problems      ?? null,
      notes:          parsed.data.notes         ?? null,
      aiProcessed:    false,
      status:         "draft",
    }).returning();
  }

  res.status(existing ? 200 : 201).json(log);
});

// POST /api/projects/:id/daily-logs/from-audio
router.post("/projects/:id/daily-logs/from-audio", requireAuth, upload.single("audio"), async (req: AuthRequest, res): Promise<void> => {
  const params = DailyLogParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;

  if (user.role === "client") { res.status(403).json({ error: "Forbidden" }); return; }

  let projectOrgId: number;
  if (isSub(user.role)) {
    const ok = await isVendorOfProject(params.data.id, user.id);
    if (!ok) { res.status(403).json({ error: "Forbidden" }); return; }
    const [proj] = await db
      .select({ organizationId: projectsTable.organizationId })
      .from(projectsTable)
      .where(eq(projectsTable.id, params.data.id));
    if (!proj) { res.status(404).json({ error: "Project not found" }); return; }
    projectOrgId = proj.organizationId;
  } else {
    const project = await checkProjectAccess(params.data.id, user);
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
    projectOrgId = project.organizationId;
  }

  if (!req.file) { res.status(400).json({ error: "Se requiere un archivo de audio" }); return; }

  const logDate  = (req.body.log_date as string | undefined) ?? new Date().toISOString().split("T")[0]!;
  const language = (req.body.language as "es" | "en" | undefined) ?? "es";

  console.log("[AUDIO] File received:", {
    mimetype: req.file?.mimetype,
    size: req.file?.buffer.length,
    originalname: req.file?.originalname,
  });

  const conflictWhere = isSub(user.role)
    ? and(
        eq(dailyLogsTable.projectId, params.data.id),
        eq(dailyLogsTable.logDate, logDate),
        eq(dailyLogsTable.createdBy, user.id),
      )
    : and(
        eq(dailyLogsTable.projectId, params.data.id),
        eq(dailyLogsTable.logDate, logDate),
      );

  const [existing] = await db
    .select({ id: dailyLogsTable.id, status: dailyLogsTable.status })
    .from(dailyLogsTable)
    .where(conflictWhere);

  if (existing?.status === "confirmed") {
    res.status(409).json({ error: "Ya existe un log confirmado para esta fecha. No se puede sobreescribir." });
    return;
  }

  const ext = AUDIO_MIME_TYPES[req.file.mimetype]
    ?? path.extname(req.file.originalname).replace(".", "")
    ?? "webm";

  // Upload audio to R2
  const r2Key = `projects/${params.data.id}/daily-logs/${logDate}-${Date.now()}.${ext}`;
  try {
    await r2Client.send(new PutObjectCommand({
      Bucket:      process.env.R2_BUCKET_NAME!,
      Key:         r2Key,
      Body:        req.file.buffer,
      ContentType: req.file.mimetype,
    }));
  } catch (err) {
    console.error("[R2] Audio upload failed:", err);
    res.status(500).json({ error: "Error al subir el audio" });
    return;
  }
  const audioUrl = getPublicUrl(r2Key);

  // Write buffer to temp file for Whisper (needs ReadStream)
  const tmpPath = path.join(os.tmpdir(), `dl-audio-${randomUUID()}.${ext}`);
  fs.writeFileSync(tmpPath, req.file.buffer);

  let transcription: string;
  let structured: Awaited<ReturnType<typeof structureDailyLog>>;

  try {
    transcription = await transcribeAudio(tmpPath, language);
    structured    = await structureDailyLog(transcription);
  } catch (err) {
    console.error("[OpenAI] Transcription/structuring failed:", err);
    res.status(500).json({ error: "Error al procesar el audio con IA" });
    return;
  } finally {
    fs.unlink(tmpPath, () => {});
  }

  let log;
  if (existing) {
    [log] = await db.update(dailyLogsTable).set({
      weather:      structured.weather       ?? null,
      temperature:  structured.temperature   ?? null,
      workersCount: structured.workers_count ?? null,
      activities:   structured.activities,
      materials:    structured.materials     ?? null,
      problems:     structured.problems      ?? null,
      notes:        structured.notes         ?? null,
      audioUrl,
      transcription,
      aiProcessed:  true,
      status:       "draft",
    }).where(eq(dailyLogsTable.id, existing.id)).returning();
  } else {
    [log] = await db.insert(dailyLogsTable).values({
      projectId:      params.data.id,
      organizationId: projectOrgId,
      createdBy:      user.id,
      logDate,
      weather:        structured.weather       ?? null,
      temperature:    structured.temperature   ?? null,
      workersCount:   structured.workers_count ?? null,
      activities:     structured.activities,
      materials:      structured.materials     ?? null,
      problems:       structured.problems      ?? null,
      notes:          structured.notes         ?? null,
      audioUrl,
      transcription,
      aiProcessed:    true,
      status:         "draft",
    }).returning();
  }

  res.status(existing ? 200 : 201).json(log);
});

// GET /api/projects/:id/daily-logs/:logId
router.get("/projects/:id/daily-logs/:logId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DailyLogIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;

  if (user.role === "client") { res.status(403).json({ error: "Forbidden" }); return; }

  if (isSub(user.role)) {
    const ok = await isVendorOfProject(params.data.id, user.id);
    if (!ok) { res.status(403).json({ error: "Forbidden" }); return; }
  } else {
    const project = await checkProjectAccess(params.data.id, user);
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  }

  const [log] = await db
    .select()
    .from(dailyLogsTable)
    .where(and(
      eq(dailyLogsTable.id, params.data.logId),
      eq(dailyLogsTable.projectId, params.data.id),
    ));

  if (!log) { res.status(404).json({ error: "Daily log not found" }); return; }

  // Subs can only read their own logs
  if (isSub(user.role) && log.createdBy !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  res.json(log);
});

// PATCH /api/projects/:id/daily-logs/:logId
router.patch("/projects/:id/daily-logs/:logId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DailyLogIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const user = req.user!;

  if (user.role === "client") { res.status(403).json({ error: "Forbidden" }); return; }

  if (isSub(user.role)) {
    const ok = await isVendorOfProject(params.data.id, user.id);
    if (!ok) { res.status(403).json({ error: "Forbidden" }); return; }
  } else {
    const project = await checkProjectAccess(params.data.id, user);
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  }

  const parsed = UpdateDailyLogBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updates: Partial<{
    weather:         string | null;
    temperature:     number | null;
    workersCount:    number | null;
    activities:      string;
    materials:       string | null;
    problems:        string | null;
    notes:           string | null;
    status:          string;
    shareWithClient: boolean;
  }> = {};

  if (parsed.data.weather           !== undefined) updates.weather         = parsed.data.weather;
  if (parsed.data.temperature       !== undefined) updates.temperature     = parsed.data.temperature;
  if (parsed.data.workers_count     !== undefined) updates.workersCount    = parsed.data.workers_count;
  if (parsed.data.activities        !== undefined) updates.activities      = parsed.data.activities;
  if (parsed.data.materials         !== undefined) updates.materials       = parsed.data.materials;
  if (parsed.data.problems          !== undefined) updates.problems        = parsed.data.problems;
  if (parsed.data.notes             !== undefined) updates.notes           = parsed.data.notes;
  if (parsed.data.status            !== undefined) updates.status          = parsed.data.status;
  if (parsed.data.share_with_client !== undefined) updates.shareWithClient = parsed.data.share_with_client;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  // Subs can only update their own logs
  const whereClause = isSub(user.role)
    ? and(
        eq(dailyLogsTable.id, params.data.logId),
        eq(dailyLogsTable.projectId, params.data.id),
        eq(dailyLogsTable.createdBy, user.id),
      )
    : and(
        eq(dailyLogsTable.id, params.data.logId),
        eq(dailyLogsTable.projectId, params.data.id),
      );

  const [log] = await db
    .update(dailyLogsTable)
    .set(updates)
    .where(whereClause)
    .returning();

  if (!log) { res.status(404).json({ error: "Daily log not found" }); return; }

  res.json(log);
});

export default router;
