import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import {
    createInsertSchema,
    createSelectSchema,
    createUpdateSchema,
} from 'drizzle-zod';
import type { z } from 'zod';

// ------------------------------------------------------------------
// 1. DRiZZLE SCHEMA (Source of Truth)
// ------------------------------------------------------------------
// This is your main table definition.
// The Zod schemas will be automatically generated from this.
// ------------------------------------------------------------------

export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name'),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),

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