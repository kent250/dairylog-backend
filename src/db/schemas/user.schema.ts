import { integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import {
    createInsertSchema,
    createSelectSchema,
    createUpdateSchema,
} from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import type { z } from 'zod';
import { refreshTokensTable } from './refresh-token.schema.js';
import { farmersTable } from './farmer.schema.js';

// ------------------------------------------------------------------
// 1. DRiZZLE SCHEMA (Source of Truth)
// ------------------------------------------------------------------
// This is your main table definition.
// The Zod schemas will be automatically generated from this.
// ------------------------------------------------------------------

export const users = pgTable('users', {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1 }),
    collection_name: varchar('collection_name'),
    username: varchar('username').unique().notNull(),
    email: varchar('email').notNull().unique(),
    password: text('password').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ------------------------------------------------------------------
// 2. ZOD SCHEMAS (Derived from Drizzle Schema)
// ------------------------------------------------------------------
// These schemas are used to validate data at different points
// in your application (e.g., API inputs, database outputs).
// ------------------------------------------------------------------

/**
 * ## insertUserSchema
 * Use this to validate data when **creating** a new user.
 * - `id`, `createdAt`, `updatedAt` are excluded as they are auto-generated.
 * - We add refinements for email and password.
 */
export const insertUserSchema = createInsertSchema(users, {
    // Add Zod refinements for validation
    // These fields are already REQUIRED by default because of Drizzle's .notNull()
    username: (schema) =>
        schema.min(3, { message: 'Username must be at least 3 characters long' }), // <-- OPTIONAL ENHANCEMENT
    email: (schema) =>
        schema.email({ message: 'Invalid email address' }),
    password: (schema) =>
        schema.min(8, { message: 'Password must be at least 8 characters long' }),
});

/**
 * ## selectUserSchema
 * Use this to validate data when **querying** a user.
 * - This is what you'd use to shape API responses.
 * - **Crucially, we omit the password** for security.
 */
export const selectUserSchema = createSelectSchema(users).omit({
    password: true,
});

/**
 * ## updateUserSchema
 * Use this to validate data when **updating** a user.
 * - All fields are automatically made optional.
 * - `id` is excluded (you can't update a primary key).
 * - We add refinements for fields that can be updated.
 */
export const updateUserSchema = createUpdateSchema(users, {
    email: (schema) =>
        schema.email({ message: 'Invalid email address' }).optional(),
    password: (schema) =>
        schema.min(8, { message: 'Password must be at least 8 characters' }).optional(),
});

// ------------------------------------------------------------------
// 3. TYPESCRIPT TYPES (Derived from Zod Schemas)
// ------------------------------------------------------------------
// We can infer TypeScript types directly from our Zod schemas
// for use in our application logic.
// ------------------------------------------------------------------

/**
 * Represents a user as it is returned from the database (password omitted).
 */
export type User = z.infer<typeof selectUserSchema>;

/**
 * Represents the data needed to create a new user.
 */
export type NewUser = z.infer<typeof insertUserSchema>;

/**
 * Represents the data that can be used to update a user.
 */
export type UpdateUser = z.infer<typeof updateUserSchema>;



export const usersRelations = relations(users, ({ many }) => ({
    refreshTokens: many(refreshTokensTable),
    registeredFarmers: many(farmersTable),
}));