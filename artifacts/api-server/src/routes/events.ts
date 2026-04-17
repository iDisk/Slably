import { Router } from "express";
import { eq, and, gte, lt, asc } from "drizzle-orm";
import { db, projectEventsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

// GET /api/events — all org events, optional filters: month, year, projectId
router.get("/api/events", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (!user.organizationId) { res.status(403).json({ error: "No organization" }); return; }

  const { month, year, projectId } = req.query;
  const conditions = [eq(projectEventsTable.organizationId, user.organizationId!)];

  if (month && year) {
    const m = parseInt(String(month));
    const y = parseInt(String(year));
    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 1);
    conditions.push(gte(projectEventsTable.date, start));
    conditions.push(lt(projectEventsTable.date, end));
  } else if (year) {
    const y = parseInt(String(year));
    conditions.push(gte(projectEventsTable.date, new Date(y, 0, 1)));
    conditions.push(lt(projectEventsTable.date, new Date(y + 1, 0, 1)));
  }

  if (projectId) {
    conditions.push(eq(projectEventsTable.projectId, parseInt(String(projectId))));
  }

  const events = await db
    .select()
    .from(projectEventsTable)
    .where(and(...conditions))
    .orderBy(asc(projectEventsTable.date));

  res.json(events);
});

// POST /api/events — create event
router.post("/api/events", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (!user.organizationId) { res.status(403).json({ error: "No organization" }); return; }

  const { title, type, date, endDate, allDay, projectId, projectName, notes } = req.body;
  if (!title || !date) { res.status(400).json({ error: "title and date are required" }); return; }

  const [event] = await db
    .insert(projectEventsTable)
    .values({
      organizationId: user.organizationId!,
      projectId:      projectId ? parseInt(String(projectId)) : null,
      createdBy:      user.id,
      title:          String(title),
      type:           String(type ?? "other"),
      date:           new Date(date),
      endDate:        endDate ? new Date(endDate) : null,
      allDay:         allDay !== false,
      notes:          notes ? String(notes) : null,
      projectName:    projectName ? String(projectName) : null,
      completed:      false,
    })
    .returning();

  res.status(201).json(event);
});

// PATCH /api/events/:id — update event
router.patch("/api/events/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (!user.organizationId) { res.status(403).json({ error: "No organization" }); return; }

  const id = parseInt(String(req.params.id));
  const [existing] = await db
    .select()
    .from(projectEventsTable)
    .where(and(eq(projectEventsTable.id, id), eq(projectEventsTable.organizationId, user.organizationId!)));

  if (!existing) { res.status(404).json({ error: "Event not found" }); return; }

  const { title, type, date, endDate, allDay, notes, completed, projectName } = req.body;
  const updates: Partial<typeof projectEventsTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (title     !== undefined) updates.title     = String(title);
  if (type      !== undefined) updates.type      = String(type);
  if (date      !== undefined) updates.date      = new Date(date);
  if (endDate   !== undefined) updates.endDate   = endDate ? new Date(endDate) : null;
  if (allDay    !== undefined) updates.allDay    = Boolean(allDay);
  if (notes     !== undefined) updates.notes     = notes ? String(notes) : null;
  if (completed !== undefined) updates.completed = Boolean(completed);
  if (projectName !== undefined) updates.projectName = projectName ? String(projectName) : null;

  const [updated] = await db
    .update(projectEventsTable)
    .set(updates)
    .where(eq(projectEventsTable.id, id))
    .returning();

  res.json(updated);
});

// DELETE /api/events/:id — delete event
router.delete("/api/events/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = req.user!;
  if (!user.organizationId) { res.status(403).json({ error: "No organization" }); return; }

  const id = parseInt(String(req.params.id));
  const [existing] = await db
    .select()
    .from(projectEventsTable)
    .where(and(eq(projectEventsTable.id, id), eq(projectEventsTable.organizationId, user.organizationId!)));

  if (!existing) { res.status(404).json({ error: "Event not found" }); return; }

  await db.delete(projectEventsTable).where(eq(projectEventsTable.id, id));
  res.json({ success: true });
});

export default router;
