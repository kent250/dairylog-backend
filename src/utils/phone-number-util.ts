/**
 * Prepends the Rwandan country code prefix '25' to a phone number
 * if it starts with '07'. Otherwise, returns the original number.
 *
 * @param phoneNumber The phone number string to format.
 * @returns The formatted phone number string or the original string.
 */
export function formatRwandanPrefix(phoneNumber: string): string {
  const trimmedNumber = phoneNumber.trim();

  // Check if it starts with '07' and has a reasonable length
  if (trimmedNumber.startsWith("07") && trimmedNumber.length >= 10) {
    // Replace the leading '0' with '250'
    return "+250" + trimmedNumber.substring(1);
  }

  return trimmedNumber;
}
