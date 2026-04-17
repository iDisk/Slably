import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const taxProClientsTable = pgTable(
  "tax_pro_clients",
  {
    id:          serial("id").primaryKey(),
    taxProId:    integer("tax_pro_id").notNull().references(() => usersTable.id),
    builderId:   integer("builder_id").notNull().references(() => usersTable.id),
    status:      text("status").notNull().default("pending"),
    invitedAt:   timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
    acceptedAt:  timestamp("accepted_at", { withTimezone: true }),
    createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tax_pro_clients_tax_pro_id_idx").on(table.taxProId),
    index("tax_pro_clients_builder_id_idx").on(table.builderId),
  ]
);

export type TaxProClient = typeof taxProClientsTable.$inferSelect;
export type InsertTaxProClient = typeof taxProClientsTable.$inferInsert;
