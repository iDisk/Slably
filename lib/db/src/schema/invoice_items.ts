import { pgTable, serial, integer, text, numeric } from "drizzle-orm/pg-core";
import { invoicesTable } from "./invoices";

export const invoiceItemsTable = pgTable(
  "invoice_items",
  {
    id:          serial("id").primaryKey(),
    invoiceId:   integer("invoice_id").notNull().references(() => invoicesTable.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity:    numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
    unitPrice:   numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
    total:       numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    sortOrder:   integer("sort_order").notNull().default(0),
  }
);

export type InvoiceItem = typeof invoiceItemsTable.$inferSelect;
export type InsertInvoiceItem = typeof invoiceItemsTable.$inferInsert;
