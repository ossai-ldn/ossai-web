export type ContactType = 'email' | 'phone';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s().-]{7,}$/;

export function classifyContact(raw: string): { type: ContactType; value: string } | null {
  const trimmed = raw.trim();
  if (trimmed.includes('@')) {
    return EMAIL_PATTERN.test(trimmed) ? { type: 'email', value: trimmed.toLowerCase() } : null;
  }
  const digitCount = (trimmed.match(/\d/g) ?? []).length;
  if (PHONE_PATTERN.test(trimmed) && digitCount >= 7) {
    const normalized = trimmed.startsWith('+')
      ? '+' + trimmed.slice(1).replace(/\D/g, '')
      : trimmed.replace(/\D/g, '');
    return { type: 'phone', value: normalized };
  }
  return null;
}
