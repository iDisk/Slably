import { pgTable, text, serial, timestamp, integer, numeric, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const projectVendorsTable = pgTable(
  "project_vendors",
  {
    id:             serial("id").primaryKey(),
    projectId:      integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
    organizationId: integer("organization_id").notNull().references(() => organizationsTable.id),
    createdBy:      integer("created_by").notNull().references(() => usersTable.id),

    name:           text("name").notNull(),
    company:        text("company"),
    email:          text("email"),
    phone:          text("phone"),
    specialty:      text("specialty"),
    type:           text("type").notNull(),

    linkedUserId:   integer("linked_user_id").references(() => usersTable.id),

    contractAmount: numeric("contract_amount", { precision: 12, scale: 2 }),
    contractNotes:  text("contract_notes"),

    status:         text("status").notNull().default("active"),

    w9Url:          text("w9_url"),
    coiUrl:         text("coi_url"),
    coiExpiresAt:   date("coi_expires_at"),

    createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("project_vendors_project_id_idx").on(table.projectId),
    index("project_vendors_organization_id_idx").on(table.organizationId),
    index("project_vendors_linked_user_id_idx").on(table.linkedUserId),
  ]
);

export const insertProjectVendorSchema = createInsertSchema(projectVendorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProjectVendor = z.infer<typeof insertProjectVendorSchema>;
export type ProjectVendor = typeof projectVendorsTable.$inferSelect;
