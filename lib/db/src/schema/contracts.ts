import { pgTable, text, serial, timestamp, integer, index, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const contractStatusEnum = pgEnum("contract_status", ["draft", "sent", "signed"]);

export const contractsTable = pgTable(
  "contracts",
  {
    id:         serial("id").primaryKey(),
    projectId:  integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
    title:      text("title").notNull(),
    fileUrl:    text("file_url"),
    version:    text("version"),
    status:     contractStatusEnum("status").notNull().default("draft"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("contracts_project_id_idx").on(table.projectId),
  ]
);

export const insertContractSchema = createInsertSchema(contractsTable).omit({ id: true, uploadedAt: true });
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contractsTable.$inferSelect;
