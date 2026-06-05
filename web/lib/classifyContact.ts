export type ContactType = 'email' | 'phone';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s().-]{7,}$/;

/** Client-side contact normalization (mirrors server `normalizeContact`). */
export function classifyContact(raw: string): { type: ContactType; value: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.includes('@')) {
    const email = trimmed.toLowerCase();
    return EMAIL_PATTERN.test(email) ? { type: 'email', value: email } : null;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || !PHONE_PATTERN.test(trimmed)) return null;

  let value: string;
  if (trimmed.startsWith('+')) {
    value = `+${digits}`;
  } else if (digits.startsWith('00')) {
    value = `+${digits.slice(2)}`;
  } else if (digits.startsWith('44') && digits.length >= 11) {
    value = `+${digits}`;
  } else if (digits.startsWith('0') && digits.length >= 10) {
    value = `+44${digits.slice(1)}`;
  } else {
    value = digits;
  }
  return { type: 'phone', value };
}
