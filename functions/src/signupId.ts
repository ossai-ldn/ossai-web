import { createHash, randomBytes } from 'crypto';

/** Stable Firestore doc id from normalized contact — one signup per email/phone. */
export function signupDocId(normalizedContact: string): string {
  return createHash('sha256').update(normalizedContact).digest('hex').slice(0, 24);
}

export function createLinkToken(): string {
  return randomBytes(24).toString('hex');
}

export function buildWelcomeLink(siteUrl: string, signupId: string, linkToken: string): string {
  const base = siteUrl.replace(/\/$/, '');
  return `${base}/welcome?sid=${encodeURIComponent(signupId)}&t=${encodeURIComponent(linkToken)}`;
}
