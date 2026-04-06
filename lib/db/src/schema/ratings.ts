import { pgTable, text, serial, timestamp, integer, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { rfqsTable } from "./rfqs";
import { usersTable } from "./users";

export const ratingsTable = pgTable(
  "ratings",
  {
    id:            serial("id").primaryKey(),
    rfqId:         integer("rfq_id").notNull().references(() => rfqsTable.id, { onDelete: "cascade" }),
    raterId:       integer("rater_id").notNull().references(() => usersTable.id),
    ratedId:       integer("rated_id").notNull().references(() => usersTable.id),
    role:          text("role").notNull(),
    quality:       integer("quality").notNull(),
    punctuality:   integer("punctuality").notNull(),
    communication: integer("communication").notNull(),
    comment:       text("comment"),
    createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("ratings_rfq_rater_unique").on(table.rfqId, table.raterId),
    index("ratings_rfq_id_idx").on(table.rfqId),
    index("ratings_rated_id_idx").on(table.ratedId),
  ]
);

export const insertRatingSchema = createInsertSchema(ratingsTable).omit({ id: true, createdAt: true });
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratingsTable.$inferSelect;
