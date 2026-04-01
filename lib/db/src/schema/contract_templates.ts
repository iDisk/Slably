import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contractTemplatesTable = pgTable("contract_templates", {
  id:        serial("id").primaryKey(),
  type:      text("type").notNull(),
  language:  text("language").notNull(),
  title:     text("title").notNull(),
  content:   text("content").notNull(),
  isActive:  boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContractTemplateSchema = createInsertSchema(contractTemplatesTable)
  .omit({ id: true, createdAt: true });
export type InsertContractTemplate = z.infer<typeof insertContractTemplateSchema>;
export type ContractTemplate = typeof contractTemplatesTable.$inferSelect;
