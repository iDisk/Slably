import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const activityLogsTable = pgTable(
  "activity_logs",
  {
    id:          serial("id").primaryKey(),
    projectId:   integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
    type:        text("type").notNull(),
    description: text("description").notNull(),
    createdBy:   integer("created_by").references(() => usersTable.id),
    createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("activity_logs_project_id_idx").on(table.projectId),
    index("activity_logs_created_at_idx").on(table.createdAt),
  ]
);

export const insertActivityLogSchema = createInsertSchema(activityLogsTable).omit({ id: true, createdAt: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogsTable.$inferSelect;
