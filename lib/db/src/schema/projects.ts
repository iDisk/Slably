import { pgTable, text, serial, timestamp, integer, date, index, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
]);

export const projectsTable = pgTable(
  "projects",
  {
    id:          serial("id").primaryKey(),
    builderId:   integer("builder_id").notNull().references(() => usersTable.id),
    clientId:    integer("client_id").references(() => usersTable.id),
    clientName:  text("client_name").notNull(),
    clientEmail: text("client_email"),
    name:        text("name").notNull(),
    address:     text("address").notNull(),
    status:      projectStatusEnum("status").notNull().default("planning"),
    startDate:   date("start_date"),
    notes:       text("notes"),
    progress:    integer("progress").notNull().default(0),
    createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("projects_builder_id_idx").on(table.builderId),
    index("projects_client_id_idx").on(table.clientId),
    index("projects_status_idx").on(table.status),
  ]
);

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
