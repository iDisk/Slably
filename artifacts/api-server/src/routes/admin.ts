import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, organizationsTable } from "@workspace/db";

const router: IRouter = Router();

function requireAdminSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = req.headers["x-admin-secret"];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// GET /admin/users
router.get("/admin/users", requireAdminSecret, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id:             usersTable.id,
      name:           usersTable.name,
      email:          usersTable.email,
      role:           usersTable.role,
      category:       usersTable.category,
      serviceCity:    usersTable.serviceCity,
      isActive:       usersTable.isActive,
      createdAt:      usersTable.createdAt,
      organizationId: usersTable.organizationId,
      companyName:    organizationsTable.companyName,
    })
    .from(usersTable)
    .leftJoin(organizationsTable, eq(usersTable.organizationId, organizationsTable.id))
    .orderBy(usersTable.createdAt);

  res.json(rows);
});

// PATCH /admin/users/:id/activate
router.patch("/admin/users/:id/activate", requireAdminSecret, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [updated] = await db
    .update(usersTable)
    .set({ isActive: true })
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json(updated);
});

// PATCH /admin/users/:id/deactivate
router.patch("/admin/users/:id/deactivate", requireAdminSecret, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [updated] = await db
    .update(usersTable)
    .set({ isActive: false })
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json(updated);
});

// DELETE /admin/users/:id
router.delete("/admin/users/:id", requireAdminSecret, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.status(204).send();
});

export default router;
