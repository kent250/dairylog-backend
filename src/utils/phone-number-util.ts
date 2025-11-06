/**
 * Valid Rwandan mobile network prefixes (without leading 0)
 * MTN: 78, 79
 * Airtel: 73
 * Both: 72 (shared)
 */
const RWANDAN_MOBILE_PREFIXES = ['72', '73', '78', '79'] as const;

/**
 * Formats a Rwandan phone number to international format (+250XXXXXXXXX).
 * 
 * Handles:
 * - Local format: 07XXXXXXXX → +25078XXXXXXXX
 * - Already formatted: 25078XXXXXXXX → +25078XXXXXXXX
 * - International format: +25078XXXXXXXX → +25078XXXXXXXX
 * - Numbers with spaces/dashes: removes them
 * 
 * @param phoneNumber - The phone number to format
 * @returns Formatted phone number in international format (+250XXXXXXXXX)
 * @throws {Error} If phone number is invalid
 * 
 * @example
 * formatRwandanPhoneNumber('0781234567')  // '+250781234567'
 * formatRwandanPhoneNumber('250781234567') // '+250781234567'
 * formatRwandanPhoneNumber('+250781234567') // '+250781234567'
 * formatRwandanPhoneNumber('078 123 4567') // '+250781234567'
 */
export function formatRwandanPhoneNumber(phoneNumber: string): string {
  // Remove whitespace, dashes, and parentheses
  let cleaned = phoneNumber.trim().replace(/[\s\-()]/g, '');

  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Case 1: Already has country code (250XXXXXXXXX)
  if (cleaned.startsWith('250')) {
    const withoutCountryCode = cleaned.substring(3);

    // Validate: should be exactly 9 digits after 250
    if (!/^\d{9}$/.test(withoutCountryCode)) {
      throw new Error(
        `Invalid Rwandan phone number: "${phoneNumber}". Expected format: +250XXXXXXXXX (13 digits total including +)`
      );
    }

    // Validate prefix (72, 73, 78, 79)
    const prefix = withoutCountryCode.substring(0, 2);
    if (!RWANDAN_MOBILE_PREFIXES.includes(prefix as '72' | '73' | '78' | '79')) {
      throw new Error(
        `Invalid Rwandan mobile prefix: "${prefix}". Valid prefixes: ${RWANDAN_MOBILE_PREFIXES.join(', ')}`
      );
    }

    return '+' + cleaned;
  }

  // Case 2: Local format (07XXXXXXXX)
  if (cleaned.startsWith('0')) {
    const withoutLeadingZero = cleaned.substring(1);

    // Validate: should be exactly 9 digits after 0
    if (!/^\d{9}$/.test(withoutLeadingZero)) {
      throw new Error(
        `Invalid Rwandan phone number: "${phoneNumber}". Expected format: 07XXXXXXXX (10 digits total)`
      );
    }

    // Validate prefix
    const prefix = withoutLeadingZero.substring(0, 2);
    if (!RWANDAN_MOBILE_PREFIXES.includes(prefix as '72' | '73' | '78' | '79')) {
      throw new Error(
        `Invalid Rwandan mobile prefix: "0${prefix}". Valid prefixes: 0${RWANDAN_MOBILE_PREFIXES.join(', 0')}`
      );
    }

    return '+250' + withoutLeadingZero;
  }

  // Case 3: Invalid format
  throw new Error(
    `Invalid Rwandan phone number format: "${phoneNumber}". ` +
    `Expected formats: 07XXXXXXXX, 250XXXXXXXXX, or +250XXXXXXXXX`
  );
}

