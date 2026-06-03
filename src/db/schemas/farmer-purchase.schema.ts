import {
    decimal,
    integer,
    pgTable,
    text,
    timestamp,
    varchar,
    date,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

import { users } from "./user.schema.js";
import { farmersTable } from "./farmer.schema.js";

// ------------------------------------------------------------------
// 1. DRIZZLE SCHEMA (Source of Truth)
// ------------------------------------------------------------------

export const farmerPurchasesTable = pgTable("farmer_purchases", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1 }),

    farmer_id: integer("farmer_id")
        .notNull()
        .references(() => farmersTable.id, { onDelete: "restrict" }),

    recorded_by_collection_id: integer("recorded_by_collection_id")
        .notNull()
        .references(() => users.id, { onDelete: "restrict" }),

    product_name: varchar("product_name", { length: 200 }).notNull(),

    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),

    unit: varchar("unit", { length: 50 }).notNull(), // e.g. "Bags", "Litres", "Kg"

    unit_price: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),

    total_amount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),

    purchase_date: date("purchase_date").notNull(), // the date the farmer took the product

    notes: text("notes"), // optional free-text notes

    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const farmerPurchasesRelations = relations(
    farmerPurchasesTable,
    ({ one }) => ({
        farmer: one(farmersTable, {
            fields: [farmerPurchasesTable.farmer_id],
            references: [farmersTable.id],
        }),
        recordedBy: one(users, {
            fields: [farmerPurchasesTable.recorded_by_collection_id],
            references: [users.id],
        }),
    })
);

// ------------------------------------------------------------------
// 2. ZOD SCHEMAS
// ------------------------------------------------------------------

export const insertFarmerPurchaseSchema = createInsertSchema(
    farmerPurchasesTable,
    {
        product_name: (schema) =>
            schema
                .min(2, { message: "Product name must be at least 2 characters." })
                .max(200, { message: "Product name cannot exceed 200 characters." }),

        unit: (schema) =>
            schema
                .min(1, { message: "Unit is required." })
                .max(50, { message: "Unit cannot exceed 50 characters." }),

        quantity: z.coerce
            .number({ error: "Quantity must be a valid number." })
            .positive({ message: "Quantity must be greater than 0." })
            .multipleOf(0.01, {
                message: "Quantity cannot have more than 2 decimal places.",
            })
            .max(99999999.99, { message: "Quantity value is too large." }),

        unit_price: z.coerce
            .number({ error: "Unit price must be a valid number." })
            .positive({ message: "Unit price must be greater than 0." })
            .multipleOf(0.01, {
                message: "Unit price cannot have more than 2 decimal places.",
            })
            .max(99999999.99, { message: "Unit price value is too large." }),

        farmer_id: z.coerce
            .number({ error: "Farmer ID must be a number." })
            .int({ message: "Farmer ID must be an integer." })
            .positive({ message: "A valid Farmer ID is required." }),

        purchase_date: z.coerce
            .date({ error: "purchase_date must be a valid date." })
            .transform((d) => d.toISOString().split("T")[0]), // store as YYYY-MM-DD

        notes: z.string().max(500).optional().nullable(),
    }
).omit({
    recorded_by_collection_id: true,
    total_amount: true, // computed: quantity * unit_price
});

export const updateFarmerPurchaseSchema = insertFarmerPurchaseSchema
    .omit({ farmer_id: true }) // farmer_id cannot be changed on update
    .partial(); // all remaining fields become optional

export const selectFarmerPurchaseSchema = createSelectSchema(
    farmerPurchasesTable
);

// ------------------------------------------------------------------
// 3. TYPESCRIPT TYPES
// ------------------------------------------------------------------

export type FarmerPurchase = typeof farmerPurchasesTable.$inferSelect;
export type NewFarmerPurchase = z.infer<typeof insertFarmerPurchaseSchema>;
export type UpdateFarmerPurchase = z.infer<typeof updateFarmerPurchaseSchema>;