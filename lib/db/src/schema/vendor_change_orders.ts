import { pgTable, text, serial, timestamp, integer, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectVendorsTable } from "./project_vendors";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const vendorChangeOrdersTable = pgTable(
  "vendor_change_orders",
  {
    id:          serial("id").primaryKey(),
    vendorId:    integer("vendor_id").notNull().references(() => projectVendorsTable.id, { onDelete: "cascade" }),
    projectId:   integer("project_id").notNull().references(() => projectsTable.id),
    createdBy:   integer("created_by").notNull().references(() => usersTable.id),

    number:      integer("number").notNull(),
    title:       text("title").notNull(),
    description: text("description"),
    amount:      numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status:      text("status").notNull().default("pending"),
    approvedAt:  timestamp("approved_at", { withTimezone: true }),

    createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("vendor_change_orders_vendor_id_idx").on(table.vendorId),
    index("vendor_change_orders_project_id_idx").on(table.projectId),
  ]
);

export const insertVendorChangeOrderSchema = createInsertSchema(vendorChangeOrdersTable).omit({ id: true, createdAt: true });
export type InsertVendorChangeOrder = z.infer<typeof insertVendorChangeOrderSchema>;
export type VendorChangeOrder = typeof vendorChangeOrdersTable.$inferSelect;
