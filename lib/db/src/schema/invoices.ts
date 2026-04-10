import { pgTable, serial, integer, text, numeric, date, timestamp, index } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const invoicesTable = pgTable(
  "invoices",
  {
    id:                serial("id").primaryKey(),
    projectId:         integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
    organizationId:    integer("organization_id").notNull().references(() => organizationsTable.id),
    senderId:          integer("sender_id").notNull().references(() => usersTable.id),
    recipientId:       integer("recipient_id").notNull().references(() => usersTable.id),
    invoiceNumber:     text("invoice_number").notNull(),
    title:             text("title").notNull(),
    notes:             text("notes"),
    subtotal:          numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    total:             numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    status:            text("status").notNull().default("draft"),
    dueDate:           date("due_date"),
    paidAt:            timestamp("paid_at", { withTimezone: true }),
    stripePaymentLink: text("stripe_payment_link"),
    pdfUrl:            text("pdf_url"),
    sentAt:            timestamp("sent_at", { withTimezone: true }),
    createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:         timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("invoices_project_id_idx").on(table.projectId),
    index("invoices_sender_id_idx").on(table.senderId),
    index("invoices_recipient_id_idx").on(table.recipientId),
    index("invoices_status_idx").on(table.status),
  ]
);

export type Invoice = typeof invoicesTable.$inferSelect;
export type InsertInvoice = typeof invoicesTable.$inferInsert;
