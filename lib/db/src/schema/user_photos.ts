import { pgTable, text, serial, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const userPhotosTable = pgTable(
  "user_photos",
  {
    id:                serial("id").primaryKey(),
    userId:            integer("user_id").notNull().references(() => usersTable.id,    { onDelete: "cascade" }),
    fileUrl:           text("file_url").notNull(),
    caption:           text("caption"),

    sharedWithBuilder: boolean("shared_with_builder").notNull().default(false),
    projectId:         integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),

    approvalStatus:    text("approval_status").notNull().default("pending"),
    approvedBy:        integer("approved_by").references(() => usersTable.id, { onDelete: "set null" }),
    approvedAt:        timestamp("approved_at", { withTimezone: true }),

    createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_photos_user_id_idx").on(table.userId),
    index("user_photos_project_id_idx").on(table.projectId),
  ]
);

export const insertUserPhotoSchema = createInsertSchema(userPhotosTable).omit({ id: true, createdAt: true });
export type InsertUserPhoto = z.infer<typeof insertUserPhotoSchema>;
export type UserPhoto = typeof userPhotosTable.$inferSelect;
