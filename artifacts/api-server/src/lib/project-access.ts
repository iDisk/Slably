import { eq, and, ne } from "drizzle-orm";
import { db, projectsTable, projectInvitationsTable } from "@workspace/db";
import type { TokenPayload } from "./auth.js";

/**
 * Centralized project access check with org isolation.
 *
 * Rules (in order):
 *  1. Token-based clients (invited, no org) → verify via project_invitations.
 *  2. Users without an organizationId cannot access any project.
 *  3. Project must belong to the user's organization (cross-org isolation).
 *  4. Builders can access any project in their org.
 *  5. Clients can only access a project they are listed as clientId.
 *
 * Returns the project on success, null on any access failure.
 */
export async function checkProjectAccess(
  projectId: number,
  user: TokenPayload
): Promise<typeof projectsTable.$inferSelect | null> {
  // 1. Token-based client (invited without org) → verify via project_invitations
  if (!user.organizationId && user.role === "client") {
    const [inv] = await db
      .select()
      .from(projectInvitationsTable)
      .where(and(
        eq(projectInvitationsTable.projectId, projectId),
        eq(projectInvitationsTable.clientId, user.id),
        ne(projectInvitationsTable.status, "expired"),
      ));
    if (!inv) return null;
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId));
    return project ?? null;
  }

  // 1b. Subcontractors y suppliers → acceden a proyectos donde son builderId
  if (user.role === "subcontractor" || user.role === "supplier") {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId));
    if (!project) return null;
    if (project.builderId === user.id) return project;
    return null;
  }

  // 2. Users without an org cannot access anything
  if (!user.organizationId) return null;

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) return null;

  // 3. Org isolation — primary barrier
  if (project.organizationId !== user.organizationId) return null;

  // 4. Role check
  if (user.role === "builder") return project;
  if (user.role === "client" && project.clientId === user.id) return project;

  return null;
}
