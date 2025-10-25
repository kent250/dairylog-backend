import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {
    createInsertSchema,
} from 'drizzle-zod';

import { users } from './user.schema.js';

export const refreshTokensTable = pgTable('refresh_tokens', {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1 }),
    token: text('token').notNull().unique(),
    user_id: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});


export const refreshTokensRelations = relations(refreshTokensTable, ({ one }) => ({
    user: one(users, {
        fields: [refreshTokensTable.user_id],
        references: [users.id],
    }),
}));


export const insertRefreshTokenSchema = createInsertSchema(refreshTokensTable, {
    token: (schema) =>
        schema.min(25, { message: 'refresh token must be at least 25 characters long' }),
    user_id: (schema) =>
        schema.int({ message: 'user id should be type of number' }),
});
