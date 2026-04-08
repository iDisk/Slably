import { pgTable, text, serial, timestamp, integer, numeric, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectVendorsTable } from "./project_vendors";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const vendorPaymentsTable = pgTable(
  "vendor_payments",
  {
    id:            serial("id").primaryKey(),
    vendorId:      integer("vendor_id").notNull().references(() => projectVendorsTable.id, { onDelete: "cascade" }),
    projectId:     integer("project_id").notNull().references(() => projectsTable.id),
    createdBy:     integer("created_by").notNull().references(() => usersTable.id),

    description:   text("description").notNull(),
    amount:        numeric("amount", { precision: 12, scale: 2 }).notNull(),
    paymentType:   text("payment_type").notNull(),
    status:        text("status").notNull().default("pending"),

    dueDate:       date("due_date"),
    paidAt:        timestamp("paid_at", { withTimezone: true }),
    paymentMethod: text("payment_method"),
    receiptUrl:    text("receipt_url"),
    notes:         text("notes"),

    createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("vendor_payments_vendor_id_idx").on(table.vendorId),
    index("vendor_payments_project_id_idx").on(table.projectId),
  ]
);

export const insertVendorPaymentSchema = createInsertSchema(vendorPaymentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVendorPayment = z.infer<typeof insertVendorPaymentSchema>;
export type VendorPayment = typeof vendorPaymentsTable.$inferSelect;
