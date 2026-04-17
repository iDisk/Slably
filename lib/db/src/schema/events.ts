import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { projectsTable } from "./projects";
import { organizationsTable } from "./organizations";

export const projectEventsTable = pgTable("project_events", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizationsTable.id),
  projectId: integer("project_id")
    .references(() => projectsTable.id),
  createdBy: integer("created_by")
    .notNull()
    .references(() => usersTable.id),
  title: text("title").notNull(),
  type: text("type").notNull().default("other"),
  date: timestamp("date").notNull(),
  endDate: timestamp("end_date"),
  allDay: boolean("all_day").default(true),
  notes: text("notes"),
  projectName: text("project_name"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
