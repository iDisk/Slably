import { pgTable, text, serial, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { contractTemplatesTable } from "./contract_templates";

export const generatedDocumentsTable = pgTable(
  "generated_documents",
  {
    id:         serial("id").primaryKey(),
    projectId:  integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
    templateId: integer("template_id").references(() => contractTemplatesTable.id),
    type:       text("type").notNull(),
    language:   text("language").notNull(),
    title:      text("title").notNull(),
    content:    text("content").notNull(),
    status:     text("status").notNull().default("draft"),

    fieldValues: jsonb("field_values"),

    contractorSignature: text("contractor_signature"),
    contractorSignedAt:  timestamp("contractor_signed_at", { withTimezone: true }),
    contractorIp:        text("contractor_ip"),

    clientSignature: text("client_signature"),
    clientSignedAt:  timestamp("client_signed_at", { withTimezone: true }),
    clientIp:        text("client_ip"),

    signedAt:  timestamp("signed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
               .$onUpdate(() => new Date()),
  },
  (table) => [
    index("generated_documents_project_id_idx").on(table.projectId),
    index("generated_documents_status_idx").on(table.status),
  ]
);

export const insertGeneratedDocumentSchema = createInsertSchema(generatedDocumentsTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGeneratedDocument = z.infer<typeof insertGeneratedDocumentSchema>;
export type GeneratedDocument = typeof generatedDocumentsTable.$inferSelect;
