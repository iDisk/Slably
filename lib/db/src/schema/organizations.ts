import { pgTable, text, varchar, serial, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const organizationsTable = pgTable(
  "organizations",
  {
    id:            serial("id").primaryKey(),
    name:          text("name").notNull(),
    slug:          text("slug").notNull().unique(),
    companyName:   text("company_name"),
    licenseNumber: text("license_number"),
    state:         text("state"),
    phone:         text("phone"),
    stripeCustomerId:         text("stripe_customer_id"),
    subscriptionPlan:         varchar("subscription_plan", { length: 50 }).notNull().default("free"),
    stripeSubscriptionId:     text("stripe_subscription_id"),
    stripeSubscriptionStatus: varchar("stripe_subscription_status", { length: 50 }).default("active"),
    planExpiresAt:            timestamp("plan_expires_at", { withTimezone: true }),
    createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("organizations_slug_idx").on(table.slug),
  ]
);

export const insertOrganizationSchema = createInsertSchema(organizationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizationsTable.$inferSelect;
