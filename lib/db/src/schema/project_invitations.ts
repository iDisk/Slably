import { pgTable, text, serial, timestamp, integer, index, unique } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { usersTable }    from "./users";

export const projectInvitationsTable = pgTable(
  "project_invitations",
  {
    id:        serial("id").primaryKey(),
    projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
    email:     text("email").notNull(),
    token:     text("token").notNull(),
    status:    text("status").notNull().default("pending"),
    clientId:  integer("client_id").references(() => usersTable.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("project_invitations_token_unique").on(table.token),
    index("project_invitations_project_id_idx").on(table.projectId),
  ]
);

export type ProjectInvitation = typeof projectInvitationsTable.$inferSelect;
export type InsertProjectInvitation = typeof projectInvitationsTable.$inferInsert;
