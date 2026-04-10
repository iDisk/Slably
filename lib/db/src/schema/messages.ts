import { pgTable, serial, integer, text, index } from "drizzle-orm/pg-core";
import { timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const messagesTable = pgTable(
  "messages",
  {
    id:          serial("id").primaryKey(),
    projectId:   integer("project_id")
                   .references(() => projectsTable.id, { onDelete: "cascade" })
                   .notNull(),
    senderId:    integer("sender_id")
                   .references(() => usersTable.id)
                   .notNull(),
    recipientId: integer("recipient_id")
                   .references(() => usersTable.id)
                   .notNull(),
    body:        text("body").notNull(),
    readAt:      timestamp("read_at", { withTimezone: true }),
    createdAt:   timestamp("created_at", { withTimezone: true })
                   .notNull()
                   .default(sql`now()`),
  },
  (t) => [
    index("messages_conversation_idx")
      .on(t.projectId, t.senderId, t.recipientId),
    index("messages_unread_idx")
      .on(t.recipientId, t.readAt),
  ]
);

export type Message    = typeof messagesTable.$inferSelect;
export type NewMessage = typeof messagesTable.$inferInsert;
