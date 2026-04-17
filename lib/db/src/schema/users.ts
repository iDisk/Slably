import { pgTable, text, serial, timestamp, integer, boolean, index, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const userRoleEnum = pgEnum("user_role", ["builder", "client", "subcontractor", "supplier", "accountant"]);

export const usersTable = pgTable(
  "users",
  {
    id:             serial("id").primaryKey(),
    organizationId: integer("organization_id").references(() => organizationsTable.id),
    name:           text("name").notNull(),
    email:          text("email").notNull().unique(),
    passwordHash:   text("password_hash").notNull(),
    role:           userRoleEnum("role").notNull().default("builder"),
    category:       text("category"),
    serviceCity:    text("service_city"),
    serviceRadius:  integer("service_radius"),
    profilePhoto:   text("profile_photo"),
    companyLogo:    text("company_logo"),
    isActive:       boolean("is_active").notNull().default(true),
    createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    lastActiveAt:   timestamp("last_active_at", { withTimezone: true }),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_role_idx").on(table.role),
    index("users_organization_id_idx").on(table.organizationId),
  ]
);

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
