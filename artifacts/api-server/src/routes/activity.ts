import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, activityLogsTable, projectsTable } from "@workspace/db";
import {
  ListActivityParams,
  ListActivityResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

router.get("/projects/:projectId/activity", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ListActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const user = req.user!;
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (user.role === "builder" && project.builderId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (user.role === "client" && project.clientId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const logs = await db.select().from(activityLogsTable)
    .where(eq(activityLogsTable.projectId, params.data.projectId))
    .orderBy(activityLogsTable.createdAt);

  res.json(ListActivityResponse.parse(logs));
});

export default router;
