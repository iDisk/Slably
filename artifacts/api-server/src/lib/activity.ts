import { db } from "@workspace/db";
import { activityLogsTable } from "@workspace/db";

export async function logActivity(
  projectId: number,
  type: string,
  description: string,
  createdBy?: number
): Promise<void> {
  await db.insert(activityLogsTable).values({
    projectId,
    type,
    description,
    createdBy: createdBy ?? null,
  });
}
