import {
  pgTable, text, serial, timestamp, integer, boolean, decimal, pgEnum,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { organizationsTable } from "./organizations";
import { projectsTable } from "./projects";

export const quoteStatusEnum = pgEnum("quote_status", [
  "draft", "sent", "approved", "rejected", "expired", "converted",
]);

export const taskTradeEnum = pgEnum("task_trade", [
  "demo", "framing", "drywall", "tile", "flooring", "plumbing",
  "electrical", "hvac", "painting", "cabinetry", "countertops",
  "roofing", "windows", "doors", "insulation", "concrete",
  "landscaping", "cleanup", "permits", "general",
]);

export const quotesTable = pgTable("quotes", {
  id:                     serial("id").primaryKey(),
  organizationId:         integer("organization_id").notNull().references(() => organizationsTable.id),
  createdBy:              integer("created_by").notNull().references(() => usersTable.id),
  title:                  text("title").notNull(),
  clientName:             text("client_name"),
  clientEmail:            text("client_email"),
  clientPhone:            text("client_phone"),
  address:                text("address"),
  city:                   text("city"),
  state:                  text("state").default("TX"),
  rawInput:               text("raw_input"),
  projectType:            text("project_type"),
  scopeSummary:           text("scope_summary"),
  totalLaborCost:         decimal("total_labor_cost",    { precision: 12, scale: 2 }).default("0"),
  totalMaterialCost:      decimal("total_material_cost", { precision: 12, scale: 2 }).default("0"),
  totalCost:              decimal("total_cost",          { precision: 12, scale: 2 }).default("0"),
  markupPercent:          decimal("markup_percent",      { precision: 5,  scale: 2 }).default("25"),
  clientPrice:            decimal("client_price",        { precision: 12, scale: 2 }).default("0"),
  estimatedMarginPercent: decimal("estimated_margin_percent", { precision: 5, scale: 2 }),
  status:                 quoteStatusEnum("status").default("draft"),
  sentAt:                 timestamp("sent_at"),
  approvedAt:             timestamp("approved_at"),
  expiresAt:              timestamp("expires_at"),
  projectId:              integer("project_id").references(() => projectsTable.id),
  convertedAt:            timestamp("converted_at"),
  aiModel:                text("ai_model"),
  aiProcessedAt:          timestamp("ai_processed_at"),
  createdAt:              timestamp("created_at").defaultNow().notNull(),
  updatedAt:              timestamp("updated_at").defaultNow().notNull(),
  deletedAt:              timestamp("deleted_at"),
});

export const quoteAreasTable = pgTable("quote_areas", {
  id:               serial("id").primaryKey(),
  quoteId:          integer("quote_id").notNull().references(() => quotesTable.id, { onDelete: "cascade" }),
  organizationId:   integer("organization_id").notNull(),
  name:             text("name").notNull(),
  scopeSummary:     text("scope_summary"),
  sortOrder:        integer("sort_order").default(0),
  totalLaborCost:    decimal("total_labor_cost",    { precision: 12, scale: 2 }).default("0"),
  totalMaterialCost: decimal("total_material_cost", { precision: 12, scale: 2 }).default("0"),
  totalCost:         decimal("total_cost",          { precision: 12, scale: 2 }).default("0"),
  clientPrice:       decimal("client_price",        { precision: 12, scale: 2 }).default("0"),
  createdAt:         timestamp("created_at").defaultNow().notNull(),
  updatedAt:         timestamp("updated_at").defaultNow().notNull(),
});

export const quoteTasksTable = pgTable("quote_tasks", {
  id:               serial("id").primaryKey(),
  quoteId:          integer("quote_id").notNull().references(() => quotesTable.id, { onDelete: "cascade" }),
  areaId:           integer("area_id").notNull().references(() => quoteAreasTable.id, { onDelete: "cascade" }),
  organizationId:   integer("organization_id").notNull(),
  name:             text("name").notNull(),
  description:      text("description"),
  trade:            taskTradeEnum("trade").default("general"),
  unit:             text("unit"),
  quantity:         decimal("quantity",          { precision: 10, scale: 2 }),
  laborCost:        decimal("labor_cost",        { precision: 12, scale: 2 }).default("0"),
  materialCost:     decimal("material_cost",     { precision: 12, scale: 2 }).default("0"),
  totalCost:        decimal("total_cost",        { precision: 12, scale: 2 }).default("0"),
  marketLaborMin:   decimal("market_labor_min",   { precision: 12, scale: 2 }),
  marketLaborMax:   decimal("market_labor_max",   { precision: 12, scale: 2 }),
  marketMaterialMin: decimal("market_material_min", { precision: 12, scale: 2 }),
  marketMaterialMax: decimal("market_material_max", { precision: 12, scale: 2 }),
  marketNote:       text("market_note"),
  isIncluded:       boolean("is_included").default(true),
  isAiDetected:     boolean("is_ai_detected").default(true),
  isAiSuggested:    boolean("is_ai_suggested").default(false),
  suggestionReason: text("suggestion_reason"),
  sortOrder:        integer("sort_order").default(0),
  createdAt:        timestamp("created_at").defaultNow().notNull(),
  updatedAt:        timestamp("updated_at").defaultNow().notNull(),
});

export const quotePriceHistoryTable = pgTable("quote_price_history", {
  id:                  serial("id").primaryKey(),
  organizationId:      integer("organization_id").notNull(),
  quoteId:             integer("quote_id").references(() => quotesTable.id),
  projectId:           integer("project_id").references(() => projectsTable.id),
  taskName:            text("task_name").notNull(),
  trade:               taskTradeEnum("trade"),
  city:                text("city"),
  state:               text("state"),
  unit:                text("unit"),
  quantity:            decimal("quantity",              { precision: 10, scale: 2 }),
  laborCostPerUnit:    decimal("labor_cost_per_unit",   { precision: 10, scale: 2 }),
  materialCostPerUnit: decimal("material_cost_per_unit",{ precision: 10, scale: 2 }),
  laborCostTotal:      decimal("labor_cost_total",      { precision: 12, scale: 2 }),
  materialCostTotal:   decimal("material_cost_total",   { precision: 12, scale: 2 }),
  wasAiSuggested:      boolean("was_ai_suggested").default(false),
  wasAccepted:         boolean("was_accepted").default(true),
  createdAt:           timestamp("created_at").defaultNow().notNull(),
});

export type Quote             = typeof quotesTable.$inferSelect;
export type QuoteArea         = typeof quoteAreasTable.$inferSelect;
export type QuoteTask         = typeof quoteTasksTable.$inferSelect;
export type QuotePriceHistory = typeof quotePriceHistoryTable.$inferSelect;
