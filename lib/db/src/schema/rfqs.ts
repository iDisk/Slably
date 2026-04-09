import { pgTable, text, serial, timestamp, integer, numeric, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const rfqsTable = pgTable(
  "rfqs",
  {
    id:             serial("id").primaryKey(),
    organizationId: integer("organization_id").references(() => organizationsTable.id, { onDelete: "cascade" }),
    createdBy:      integer("created_by").notNull().references(() => usersTable.id),
    projectId:      integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
    title:          text("title").notNull(),
    description:    text("description").notNull(),
    specialty:      text("specialty").notNull(),
    city:           text("city").notNull(),
    budgetMin:      numeric("budget_min", { precision: 12, scale: 2 }),
    budgetMax:      numeric("budget_max", { precision: 12, scale: 2 }),
    startDate:      date("start_date"),
    status:         text("status").notNull().default("open"),
    createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    completedAt:    timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("rfqs_organization_id_idx").on(table.organizationId),
    index("rfqs_created_by_idx").on(table.createdBy),
    index("rfqs_status_idx").on(table.status),
  ]
);

export const insertRfqSchema = createInsertSchema(rfqsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRfq = z.infer<typeof insertRfqSchema>;
export type Rfq = typeof rfqsTable.$inferSelect;
