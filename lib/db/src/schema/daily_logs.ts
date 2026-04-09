import { pgTable, text, serial, integer, date, boolean, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const dailyLogsTable = pgTable(
  "daily_logs",
  {
    id:             serial("id").primaryKey(),
    projectId:      integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
    organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
    createdBy:      integer("created_by").notNull().references(() => usersTable.id),
    logDate:        date("log_date").notNull(),
    weather:        text("weather"),
    temperature:    integer("temperature"),
    workersCount:   integer("workers_count"),
    activities:     text("activities"),
    materials:      text("materials"),
    problems:       text("problems"),
    notes:          text("notes"),
    audioUrl:       text("audio_url"),
    transcription:  text("transcription"),
    aiProcessed:    boolean("ai_processed").notNull().default(false),
    status:         text("status").notNull().default("draft"),
    shareWithClient: boolean("share_with_client").notNull().default(false),
    createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    unique("daily_logs_project_date_uniq").on(table.projectId, table.logDate),
    index("daily_logs_project_id_idx").on(table.projectId),
    index("daily_logs_organization_id_idx").on(table.organizationId),
    index("daily_logs_log_date_idx").on(table.logDate),
  ]
);

export const insertDailyLogSchema = createInsertSchema(dailyLogsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDailyLog = z.infer<typeof insertDailyLogSchema>;
export type DailyLog = typeof dailyLogsTable.$inferSelect;
