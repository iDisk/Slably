import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const realtorClientsTable = pgTable("realtor_clients", {
  id:               serial("id").primaryKey(),
  realtorId:        integer("realtor_id").notNull().references(() => usersTable.id),
  name:             text("name").notNull(),
  email:            text("email"),
  phone:            text("phone"),
  clientType:       text("client_type").notNull().default("buyer"),
  budget:           text("budget"),
  city:             text("city"),
  propertiesShown:  integer("properties_shown").default(0).notNull(),
  notes:            text("notes"),
  lastNoteAt:       timestamp("last_note_at", { withTimezone: true }),
  isActive:         boolean("is_active").notNull().default(true),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
