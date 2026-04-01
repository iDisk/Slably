import { pgTable, text, serial, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const projectPhasesTable = pgTable(
  "project_phases",
  {
    id:           serial("id").primaryKey(),
    projectId:    integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
    phaseTitle:   text("phase_title").notNull(),
    activityText: text("activity_text").notNull(),
    activityType: text("activity_type"),
    completed:    boolean("completed").notNull().default(false),
    sortOrder:    integer("sort_order").notNull().default(0),
    createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("project_phases_project_id_idx").on(table.projectId),
  ]
);

export const insertProjectPhaseSchema = createInsertSchema(projectPhasesTable).omit({ id: true, createdAt: true });
export type InsertProjectPhase = z.infer<typeof insertProjectPhaseSchema>;
export type ProjectPhase = typeof projectPhasesTable.$inferSelect;
