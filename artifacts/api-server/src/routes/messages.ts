import { Router, type IRouter } from "express";
import { eq, and, or, isNull } from "drizzle-orm";
import { db, messagesTable, usersTable, projectVendorsTable } from "@workspace/db";
import { SendMessageBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { checkProjectAccess } from "../lib/project-access.js";

const router: IRouter = Router();

async function isVendorOfProject(projectId: number, userId: number): Promise<boolean> {
  const rows = await db
    .select({ id: projectVendorsTable.id })
    .from(projectVendorsTable)
    .where(and(
      eq(projectVendorsTable.projectId, projectId),
      eq(projectVendorsTable.linkedUserId, userId),
    ));
  return rows.length > 0;
}

async function hasProjectAccess(projectId: number, user: AuthRequest["user"]): Promise<boolean> {
  if (user!.role === "builder" || user!.role === "client") {
    const project = await checkProjectAccess(projectId, user!);
    return project !== null;
  }
  if (user!.role === "subcontractor" || user!.role === "supplier") {
    return isVendorOfProject(projectId, user!.id);
  }
  return false;
}

// ── UNREAD COUNT (antes de /messages para evitar conflicto de routing) ─────────

router.get("/projects/:projectId/messages/unread-count", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid projectId" }); return; }
  const user = req.user!;

  const ok = await hasProjectAccess(projectId, user);
  if (!ok) { res.status(404).json({ error: "Project not found" }); return; }

  const rows = await db
    .select({ id: messagesTable.id })
    .from(messagesTable)
    .where(and(
      eq(messagesTable.projectId, projectId),
      eq(messagesTable.recipientId, user.id),
      isNull(messagesTable.readAt),
    ));

  res.json({ count: rows.length });
});

// ── GET /api/projects/:projectId/messages?with=<userId> ───────────────────────

router.get("/projects/:projectId/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const projectId  = parseInt(req.params.projectId as string);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid projectId" }); return; }
  const withUserId = parseInt(req.query.with as string);
  if (isNaN(withUserId)) { res.status(400).json({ error: "Query param 'with' (userId) is required" }); return; }

  const user = req.user!;
  const ok = await hasProjectAccess(projectId, user);
  if (!ok) { res.status(404).json({ error: "Project not found" }); return; }

  const messages = await db
    .select({
      id:          messagesTable.id,
      projectId:   messagesTable.projectId,
      senderId:    messagesTable.senderId,
      recipientId: messagesTable.recipientId,
      body:        messagesTable.body,
      readAt:      messagesTable.readAt,
      createdAt:   messagesTable.createdAt,
      senderName:  usersTable.name,
    })
    .from(messagesTable)
    .leftJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .where(and(
      eq(messagesTable.projectId, projectId),
      or(
        and(eq(messagesTable.senderId, user.id),    eq(messagesTable.recipientId, withUserId)),
        and(eq(messagesTable.senderId, withUserId), eq(messagesTable.recipientId, user.id)),
      ),
    ))
    .orderBy(messagesTable.createdAt);

  // Marcar como leídos los mensajes recibidos sin leer
  const hasUnread = messages.some(m => m.recipientId === user.id && m.readAt === null);
  if (hasUnread) {
    await db.update(messagesTable)
      .set({ readAt: new Date() })
      .where(and(
        eq(messagesTable.projectId,   projectId),
        eq(messagesTable.senderId,    withUserId),
        eq(messagesTable.recipientId, user.id),
        isNull(messagesTable.readAt),
      ));
  }

  res.json(messages);
});

// ── POST /api/projects/:projectId/messages ────────────────────────────────────

router.post("/projects/:projectId/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid projectId" }); return; }

  const user = req.user!;
  const ok = await hasProjectAccess(projectId, user);
  if (!ok) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Verificar que el destinatario existe
  const [recipient] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, parsed.data.recipient_id))
    .limit(1);
  if (!recipient) { res.status(400).json({ error: "Recipient not found" }); return; }

  const [inserted] = await db.insert(messagesTable).values({
    projectId,
    senderId:    user.id,
    recipientId: parsed.data.recipient_id,
    body:        parsed.data.body,
  }).returning();

  const [msg] = await db
    .select({
      id:          messagesTable.id,
      projectId:   messagesTable.projectId,
      senderId:    messagesTable.senderId,
      recipientId: messagesTable.recipientId,
      body:        messagesTable.body,
      readAt:      messagesTable.readAt,
      createdAt:   messagesTable.createdAt,
      senderName:  usersTable.name,
    })
    .from(messagesTable)
    .leftJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .where(eq(messagesTable.id, inserted.id));

  res.status(201).json(msg);
});

export default router;
