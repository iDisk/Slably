import { pgTable, text, serial, timestamp, integer, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { rfqsTable } from "./rfqs";
import { usersTable } from "./users";

export const rfqQuotesTable = pgTable(
  "rfq_quotes",
  {
    id:              serial("id").primaryKey(),
    rfqId:           integer("rfq_id").notNull().references(() => rfqsTable.id, { onDelete: "cascade" }),
    subcontractorId: integer("subcontractor_id").notNull().references(() => usersTable.id),
    amount:          numeric("amount", { precision: 12, scale: 2 }).notNull(),
    message:         text("message"),
    status:          text("status").notNull().default("pending"),
    createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("rfq_quotes_rfq_id_idx").on(table.rfqId),
    index("rfq_quotes_subcontractor_id_idx").on(table.subcontractorId),
  ]
);

export const insertRfqQuoteSchema = createInsertSchema(rfqQuotesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRfqQuote = z.infer<typeof insertRfqQuoteSchema>;
export type RfqQuote = typeof rfqQuotesTable.$inferSelect;
