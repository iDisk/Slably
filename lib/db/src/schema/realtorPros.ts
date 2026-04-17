import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const realtorTrustedProsTable = pgTable("realtor_trusted_pros", {
  id:        serial("id").primaryKey(),
  realtorId: integer("realtor_id").notNull().references(() => usersTable.id),
  proId:     integer("pro_id").notNull().references(() => usersTable.id),
  note:      text("note"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
