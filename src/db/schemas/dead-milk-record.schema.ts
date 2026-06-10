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

export const deadMilkRecordsTable = pgTable("dead_milk_records", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1 }),

    farmer_id: integer("farmer_id")
        .notNull()
        .references(() => farmersTable.id, { onDelete: "restrict" }),

    recorded_by_collection_id: integer("recorded_by_collection_id")
        .notNull()
        .references(() => users.id, { onDelete: "restrict" }),

    liters: decimal("liters", { precision: 10, scale: 2 }).notNull(),

    reason: varchar("reason", { length: 200 }).notNull(), // e.g. "Bad smell", "Sour", "Contaminated"

    notes: text("notes"), // optional extra details

    recordedAt: date("recorded_at").notNull(), // the actual date the milk was rejected

    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const deadMilkRecordsRelations = relations(
    deadMilkRecordsTable,
    ({ one }) => ({
        farmer: one(farmersTable, {
            fields: [deadMilkRecordsTable.farmer_id],
            references: [farmersTable.id],
        }),
        recordedBy: one(users, {
            fields: [deadMilkRecordsTable.recorded_by_collection_id],
            references: [users.id],
        }),
    })
);

// ------------------------------------------------------------------
// 2. ZOD SCHEMAS
// ------------------------------------------------------------------

/**
 * ## insertDeadMilkRecordSchema
 *
 * The frontend sends any combination of:
 *   - farmerId       (number)  — find farmer by ID
 *   - farmerPhone    (string)  — find farmer by phone
 *   - farmerName     (string)  — find farmer by name
 *
 * At least ONE of these three must be present (enforced via .refine).
 * If multiple are provided, priority is: farmerId > farmerPhone > farmerName.
 *
 * Required fields: liters, reason, recordedAt
 * Optional fields: notes
 */
export const insertDeadMilkRecordSchema = z
    .object({
        // Farmer identification — at least one required
        farmerId: z.coerce
            .number({ error: "farmerId must be a number." })
            .int({ message: "farmerId must be an integer." })
            .positive({ message: "farmerId must be a positive integer." })
            .optional(),

        farmerPhone: z
            .string()
            .regex(/^(\+?25)?(07[2389])[0-9]{7}$/, {
                message: "Invalid Rwandan phone number format.",
            })
            .optional(),

        farmerName: z
            .string()
            .min(2, { message: "farmerName must be at least 2 characters." })
            .optional(),

        // Milk details
        liters: z.coerce
            .number({ error: "liters must be a valid number." })
            .positive({ message: "liters must be greater than 0." })
            .multipleOf(0.01, {
                message: "liters cannot have more than 2 decimal places.",
            })
            .max(99999999.99, { message: "liters value is too large." }),

        reason: z
            .string()
            .min(2, { message: "reason must be at least 2 characters." })
            .max(200, { message: "reason cannot exceed 200 characters." }),

        notes: z.string().max(1000).optional().nullable(),

        recordedAt: z.coerce
            .date({ error: "recordedAt must be a valid date." })
            .transform((d) => d.toISOString().split("T")[0]), // store as YYYY-MM-DD
    })
    .refine(
        (data) =>
            data.farmerId !== undefined ||
            data.farmerPhone !== undefined ||
            data.farmerName !== undefined,
        {
            message:
                "At least one of farmerId, farmerPhone, or farmerName is required to identify the farmer.",
            path: ["farmerId"],
        }
    );

export const selectDeadMilkRecordSchema = createSelectSchema(
    deadMilkRecordsTable
);

// ------------------------------------------------------------------
// 3. TYPESCRIPT TYPES
// ------------------------------------------------------------------

export type DeadMilkRecord = typeof deadMilkRecordsTable.$inferSelect;
export type NewDeadMilkRecord = z.infer<typeof insertDeadMilkRecordSchema>;