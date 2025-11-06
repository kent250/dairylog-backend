import { formatRwandanPhoneNumber } from '../phone-number-util.js';

describe('formatRwandanPhoneNumber', () => {
    describe('valid local format (07XXXXXXXX)', () => {
        it('formats MTN numbers correctly', () => {
            expect(formatRwandanPhoneNumber('0781234567')).toBe('+250781234567');
            expect(formatRwandanPhoneNumber('0791234567')).toBe('+250791234567');
        });

        it('formats Airtel numbers correctly', () => {
            expect(formatRwandanPhoneNumber('0731234567')).toBe('+250731234567');
        });

        it('formats shared prefix numbers correctly', () => {
            expect(formatRwandanPhoneNumber('0721234567')).toBe('+250721234567');
        });

        it('handles numbers with spaces', () => {
            expect(formatRwandanPhoneNumber('078 123 4567')).toBe('+250781234567');
            expect(formatRwandanPhoneNumber('078 123 45 67')).toBe('+250781234567');
        });

        it('handles numbers with dashes', () => {
            expect(formatRwandanPhoneNumber('078-123-4567')).toBe('+250781234567');
        });

        it('handles numbers with parentheses', () => {
            expect(formatRwandanPhoneNumber('(078) 123-4567')).toBe('+250781234567');
        });
    });

    describe('valid international format', () => {
        it('handles already formatted numbers', () => {
            expect(formatRwandanPhoneNumber('250781234567')).toBe('+250781234567');
        });

        it('handles numbers with + prefix', () => {
            expect(formatRwandanPhoneNumber('+250781234567')).toBe('+250781234567');
        });

        it('handles formatted numbers with spaces', () => {
            expect(formatRwandanPhoneNumber('+250 78 123 4567')).toBe('+250781234567');
        });
    });

    describe('invalid inputs', () => {
        it('rejects numbers with invalid prefixes', () => {
            expect(() => formatRwandanPhoneNumber('0751234567')).toThrow('Invalid Rwandan mobile prefix');
            expect(() => formatRwandanPhoneNumber('0701234567')).toThrow('Invalid Rwandan mobile prefix');
            expect(() => formatRwandanPhoneNumber('0881234567')).toThrow('Invalid Rwandan mobile prefix');
        });

        it('rejects numbers that are too short', () => {
            expect(() => formatRwandanPhoneNumber('078123456')).toThrow('Expected format: 07XXXXXXXX');
            expect(() => formatRwandanPhoneNumber('0781234')).toThrow('Expected format: 07XXXXXXXX');
        });

        it('rejects numbers that are too long', () => {
            expect(() => formatRwandanPhoneNumber('07812345678')).toThrow('Expected format: 07XXXXXXXX');
        });

        it('rejects numbers with non-digits', () => {
            expect(() => formatRwandanPhoneNumber('078abc4567')).toThrow('Expected format: 07XXXXXXXX');
            expect(() => formatRwandanPhoneNumber('078123456x')).toThrow('Expected format: 07XXXXXXXX');
        });

        it('rejects empty strings', () => {
            expect(() => formatRwandanPhoneNumber('')).toThrow('Invalid Rwandan phone number format');
        });

        it('rejects whitespace-only strings', () => {
            expect(() => formatRwandanPhoneNumber('   ')).toThrow('Invalid Rwandan phone number format');
        });

        it('rejects completely wrong formats', () => {
            expect(() => formatRwandanPhoneNumber('1234567890')).toThrow('Invalid Rwandan phone number format');
            expect(() => formatRwandanPhoneNumber('+1234567890')).toThrow('Invalid Rwandan phone number format');
        });
    });

    describe('edge cases', () => {
        it('handles extra whitespace', () => {
            expect(formatRwandanPhoneNumber('  0781234567  ')).toBe('+250781234567');
        });

        it('is idempotent for valid numbers', () => {
            const formatted = formatRwandanPhoneNumber('0781234567');
            expect(formatRwandanPhoneNumber(formatted)).toBe(formatted);
        });
    });
});
