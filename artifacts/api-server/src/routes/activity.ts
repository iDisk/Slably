import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, activityLogsTable } from "@workspace/db";
import { ListActivityParams, ListActivityResponse } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { checkProjectAccess } from "../lib/project-access.js";

const router: IRouter = Router();

router.get("/projects/:projectId/activity", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ListActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const project = await checkProjectAccess(params.data.projectId, req.user!);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const logs = await db
    .select()
    .from(activityLogsTable)
    .where(eq(activityLogsTable.projectId, params.data.projectId))
    .orderBy(activityLogsTable.createdAt);

  res.json(ListActivityResponse.parse(logs));
});

export default router;
