import { randomBytes } from 'crypto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Generates a unique customer discount code (e.g. OSSAI-K7M2N9P). */
export function generateDiscountCode(): string {
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    const idx = randomBytes(1)[0] % CODE_ALPHABET.length;
    suffix += CODE_ALPHABET[idx];
  }
  return `OSSAI-${suffix}`;
}

export const DEFAULT_DISCOUNT_PERCENT = 10;
