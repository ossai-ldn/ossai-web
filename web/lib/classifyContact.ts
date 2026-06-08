export type ContactType = 'email' | 'phone';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_INPUT_PATTERN = /^\+?[0-9\s().-]{7,}$/;
const E164_RE = /^\+[1-9]\d{6,14}$/;

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

function isObviouslyInvalid(digits: string): boolean {
  if (digits.length < 7) return true;
  const tail = digits.slice(-10);
  if (/^0+$/.test(tail) || /^0+$/.test(digits)) return true;
  return false;
}

function fixUkE164(e164: string): string {
  const match = e164.match(/^\+44(0+)([1-9]\d*)$/);
  if (match) return `+44${match[2]}`;
  return e164;
}

function isValidE164(value: string): boolean {
  if (!E164_RE.test(value)) return false;
  return !isObviouslyInvalid(value.slice(1));
}

function phoneDigitsToE164(digits: string): string | null {
  if (isObviouslyInvalid(digits)) return null;

  let candidate: string | null = null;

  if (digits.startsWith('00')) {
    candidate = `+${digits.slice(2)}`;
  } else if (digits.startsWith('44')) {
    const national = digits.slice(2).replace(/^0+/, '');
    candidate = `+44${national}`;
  } else if (digits.startsWith('0') && digits.length >= 10) {
    candidate = `+44${digits.slice(1)}`;
  } else if (digits.length === 10 && digits.startsWith('7')) {
    candidate = `+44${digits}`;
  } else if (digits.length >= 8 && digits.length <= 15) {
    candidate = `+${digits}`;
  }

  if (!candidate) return null;
  candidate = fixUkE164(candidate);
  return isValidE164(candidate) ? candidate : null;
}

/** Client-side contact normalization (mirrors server `normalizeContact`). */
export function classifyContact(raw: string): { type: ContactType; value: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.includes('@')) {
    const email = trimmed.toLowerCase();
    return EMAIL_PATTERN.test(email) ? { type: 'email', value: email } : null;
  }

  if (!PHONE_INPUT_PATTERN.test(trimmed)) return null;

  const digits = digitsOnly(trimmed);
  const e164 = trimmed.startsWith('+')
    ? phoneDigitsToE164(digits) ?? (() => {
        const candidate = fixUkE164(`+${digits}`);
        return isValidE164(candidate) ? candidate : null;
      })()
    : phoneDigitsToE164(digits);

  if (!e164) return null;
  return { type: 'phone', value: e164 };
}
