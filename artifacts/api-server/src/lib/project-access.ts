import { eq } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import type { TokenPayload } from "./auth.js";

/**
 * Centralized project access check with org isolation.
 *
 * Rules (in order):
 *  1. Users without an organizationId cannot access any project.
 *  2. Project must belong to the user's organization (cross-org isolation).
 *  3. Builders can access any project in their org.
 *  4. Clients can only access a project they are listed as clientId.
 *
 * Returns the project on success, null on any access failure.
 */
export async function checkProjectAccess(
  projectId: number,
  user: TokenPayload
): Promise<typeof projectsTable.$inferSelect | null> {
  // 1. Users without an org cannot access anything
  if (!user.organizationId) return null;

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) return null;

  // 2. Org isolation — primary barrier
  if (project.organizationId !== user.organizationId) return null;

  // 3. Role check
  if (user.role === "builder") return project;
  if (user.role === "client" && project.clientId === user.id) return project;

  return null;
}
