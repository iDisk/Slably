import { pgTable, text, serial, timestamp, integer, numeric, index, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const changeOrderStatusEnum = pgEnum("change_order_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
]);

export const changeOrdersTable = pgTable(
  "change_orders",
  {
    id:          serial("id").primaryKey(),
    projectId:   integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
    title:       text("title").notNull(),
    description: text("description"),
    amount:      numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
    status:      changeOrderStatusEnum("status").notNull().default("draft"),
    createdBy:   integer("created_by").notNull().references(() => usersTable.id),
    approvedBy:  integer("approved_by").references(() => usersTable.id),
    createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    approvedAt:  timestamp("approved_at", { withTimezone: true }),
  },
  (table) => [
    index("change_orders_project_id_idx").on(table.projectId),
    index("change_orders_status_idx").on(table.status),
  ]
);

export const insertChangeOrderSchema = createInsertSchema(changeOrdersTable).omit({ id: true, createdAt: true, approvedAt: true });
export type InsertChangeOrder = z.infer<typeof insertChangeOrderSchema>;
export type ChangeOrder = typeof changeOrdersTable.$inferSelect;
