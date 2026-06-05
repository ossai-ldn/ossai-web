export type ContactType = 'email' | 'phone';

/** Normalizes email/phone for storage and deduplication. */
export function normalizeContact(raw: string): { type: ContactType; value: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.includes('@')) {
    const email = trimmed.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return { type: 'email', value: email };
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7) return null;
  if (!/^\+?[0-9\s().-]{7,}$/.test(trimmed)) return null;

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
