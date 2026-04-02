import { pgTable, text, serial, timestamp, integer, numeric, boolean, index, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const expenseCategoryEnum = pgEnum("expense_category", [
  "materials", "labor", "equipment", "permits", "other",
]);

export const expensePaymentMethodEnum = pgEnum("expense_payment_method", [
  "cash", "card", "transfer", "check",
]);

export const expensesTable = pgTable(
  "expenses",
  {
    id:            serial("id").primaryKey(),
    projectId:     integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
    createdBy:     integer("created_by").notNull().references(() => usersTable.id),
    amount:        numeric("amount", { precision: 12, scale: 2 }).notNull(),
    vendor:        text("vendor").notNull(),
    description:   text("description"),
    category:      expenseCategoryEnum("category").notNull(),
    receiptUrl:    text("receipt_url"),
    expenseDate:   text("expense_date").notNull(),
    paymentMethod: expensePaymentMethodEnum("payment_method"),
    approved:      boolean("approved").notNull().default(false),
    ocrRaw:        jsonb("ocr_raw"),
    ocrConfidence: integer("ocr_confidence"),
    createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("expenses_project_id_idx").on(table.projectId),
  ]
);

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
