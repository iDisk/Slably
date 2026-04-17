import { Router, type IRouter } from "express";
import { randomBytes } from "crypto";
import { eq, and, ne } from "drizzle-orm";
import {
  db, projectInvitationsTable, projectsTable, usersTable, organizationsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest, signToken } from "../lib/auth.js";
import { checkProjectAccess } from "../lib/project-access.js";
import { sendInvitationEmail } from "../lib/email.js";

const router: IRouter = Router();

const APP_URL = process.env.APP_URL ?? "http://localhost:5173";

router.post("/projects/:projectId/invite", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid projectId" }); return; }

  const user = req.user!;
  if (user.role === "client") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const { email } = req.body;
  if (!email || typeof email !== "string") { res.status(400).json({ error: "email is required" }); return; }

  const [builderRow] = await db
    .select({ name: usersTable.name, companyName: organizationsTable.companyName })
    .from(usersTable)
    .leftJoin(organizationsTable, eq(usersTable.organizationId, organizationsTable.id))
    .where(eq(usersTable.id, user.id));

  const builderName    = builderRow?.name ?? user.email;
  const builderCompany = builderRow?.companyName ?? null;

  await db
    .update(projectInvitationsTable)
    .set({ status: "expired" })
    .where(and(
      eq(projectInvitationsTable.projectId, projectId),
      ne(projectInvitationsTable.status, "expired"),
    ));

  const token     = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const [invitation] = await db
    .insert(projectInvitationsTable)
    .values({ projectId, email, token, expiresAt })
    .returning();

  const inviteUrl = `${APP_URL}/invite/${token}`;

  try {
    await sendInvitationEmail({ to: email, builderName, builderCompany, projectName: project.name, inviteUrl });
  } catch (err) {
    console.error("[INVITE] Email send failed:", err);
  }

  res.json({ token, invite_url: inviteUrl, email: invitation.email, expires_at: invitation.expiresAt });
});

router.get("/invitations/:token", async (req, res): Promise<void> => {
  const { token } = req.params;

  const [inv] = await db
    .select()
    .from(projectInvitationsTable)
    .where(eq(projectInvitationsTable.token, token));

  if (!inv) { res.status(404).json({ error: "Invitation not found" }); return; }

  if (inv.expiresAt < new Date()) {
    await db.update(projectInvitationsTable).set({ status: "expired" }).where(eq(projectInvitationsTable.id, inv.id));
    res.status(404).json({ error: "This link has expired" });
    return;
  }

  const [projectRow] = await db
    .select({ name: projectsTable.name, builderId: projectsTable.builderId })
    .from(projectsTable)
    .where(eq(projectsTable.id, inv.projectId));

  if (!projectRow) { res.status(404).json({ error: "Project not found" }); return; }

  const [builderRow] = await db
    .select({ name: usersTable.name, companyName: organizationsTable.companyName })
    .from(usersTable)
    .leftJoin(organizationsTable, eq(usersTable.organizationId, organizationsTable.id))
    .where(eq(usersTable.id, projectRow.builderId));

  res.json({
    project_name:    projectRow.name,
    builder_name:    builderRow?.name ?? "",
    builder_company: builderRow?.companyName ?? null,
    email:           inv.email,
    status:          inv.status,
    expires_at:      inv.expiresAt,
  });
});

router.post("/invitations/:token/access", async (req, res): Promise<void> => {
  const { token } = req.params;

  const [inv] = await db
    .select()
    .from(projectInvitationsTable)
    .where(eq(projectInvitationsTable.token, token));

  if (!inv) { res.status(404).json({ error: "Invitation not found" }); return; }

  if (inv.expiresAt < new Date()) {
    await db.update(projectInvitationsTable).set({ status: "expired" }).where(eq(projectInvitationsTable.id, inv.id));
    res.status(410).json({ error: "This link has expired" });
    return;
  }

  let userId: number;

  if (inv.clientId !== null) {
    userId = inv.clientId;
  } else {
    const [newUser] = await db
      .insert(usersTable)
      .values({ name: inv.email, email: inv.email, passwordHash: "", role: "client", organizationId: null })
      .returning();
    userId = newUser.id;
    await db.update(projectInvitationsTable).set({ clientId: userId, status: "accessed" }).where(eq(projectInvitationsTable.id, inv.id));
  }

  const [userRow] = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!userRow) { res.status(500).json({ error: "User lookup failed" }); return; }

  const jwt = signToken({ id: userRow.id, email: userRow.email, role: userRow.role, organizationId: null, organizationSlug: null, organizationPlan: null, stripeSubscriptionStatus: null });

  res.json({ token: jwt, user: { id: userRow.id, name: userRow.name, email: userRow.email, role: userRow.role }, project_id: inv.projectId });
});

router.get("/projects/:projectId/invitation", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid projectId" }); return; }

  const user = req.user!;
  if (user.role !== "builder") { res.status(403).json({ error: "Forbidden" }); return; }

  const project = await checkProjectAccess(projectId, user);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [inv] = await db
    .select()
    .from(projectInvitationsTable)
    .where(and(
      eq(projectInvitationsTable.projectId, projectId),
      ne(projectInvitationsTable.status, "expired"),
    ));

  if (!inv) { res.json(null); return; }

  res.json({ invite_url: `${APP_URL}/invite/${inv.token}`, email: inv.email, status: inv.status, expires_at: inv.expiresAt });
});

export default router;
