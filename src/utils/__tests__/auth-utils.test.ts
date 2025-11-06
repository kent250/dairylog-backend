import bcrypt from 'bcrypt';
import { hashData } from '../auth-utils';
import { config } from '../../config/env.js';

describe('hashData', () => {
    describe('hash generation', () => {
        it('produces different hashes for different inputs', async () => {
            const hash1 = await hashData('password123');
            const hash2 = await hashData('password456');

            expect(hash1).not.toBe(hash2);
        });

        it('produces different hashes for same input due to random salt', async () => {
            const input = 'same-password';
            const hash1 = await hashData(input);
            const hash2 = await hashData(input);

            // Different hashes due to bcrypt's random salt
            expect(hash1).not.toBe(hash2);

            // But both should be valid bcrypt hashes
            expect(hash1).toMatch(/^\$2[aby]\$/);
            expect(hash2).toMatch(/^\$2[aby]\$/);
        });

        it('generates valid bcrypt hash format', async () => {
            const hash = await hashData('test-data');

            // Bcrypt hash format: $2a$10$[22 char salt][31 char hash]
            expect(hash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
        });

        it('handles empty string', async () => {
            const hash = await hashData('');

            expect(hash).toMatch(/^\$2[aby]\$/);
            expect(hash.length).toBeGreaterThan(0);
        });

        it('handles long strings', async () => {
            const longString = 'a'.repeat(1000);
            const hash = await hashData(longString);

            expect(hash).toMatch(/^\$2[aby]\$/);
        });

        it('handles special characters', async () => {
            const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
            const hash = await hashData(specialChars);

            expect(hash).toMatch(/^\$2[aby]\$/);
        });
    });

    describe('bcrypt configuration', () => {
        it('uses configured salt rounds from config', async () => {
            const hash = await hashData('test-password');

            // Extract cost factor from hash (format: $2b$10$...)
            const parts = hash.split('$');
            const costFactor = parseInt(parts[2], 10);

            expect(costFactor).toBe(config.bcryptSaltRounds);
        });

        it('uses salt rounds within secure range', async () => {
            const hash = await hashData('test-password');

            const parts = hash.split('$');
            const costFactor = parseInt(parts[2], 10);

            // Verify it's within the secure range defined in env schema (10-15)
            expect(costFactor).toBeGreaterThanOrEqual(10);
            expect(costFactor).toBeLessThanOrEqual(15);
        });
    });

    describe('hash verification', () => {
        it('generated hash can be verified with bcrypt.compare', async () => {
            const password = 'my-secure-password';
            const hash = await hashData(password);

            const isValid = await bcrypt.compare(password, hash);
            expect(isValid).toBe(true);
        });

        it('hash verification fails for incorrect password', async () => {
            const password = 'correct-password';
            const hash = await hashData(password);

            const isValid = await bcrypt.compare('wrong-password', hash);
            expect(isValid).toBe(false);
        });

        it('hash is case-sensitive', async () => {
            const password = 'Password123';
            const hash = await hashData(password);

            const correctCase = await bcrypt.compare('Password123', hash);
            const wrongCase = await bcrypt.compare('password123', hash);

            expect(correctCase).toBe(true);
            expect(wrongCase).toBe(false);
        });
    });

    describe('performance', () => {
        it('completes hashing within reasonable time', async () => {
            const startTime = Date.now();
            await hashData('test-password');
            const duration = Date.now() - startTime;

            // With 10-15 rounds, should complete within 1 second
            // This is a sanity check, not a performance benchmark
            expect(duration).toBeLessThan(1000);
        });
    });
});