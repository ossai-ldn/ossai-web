import { getFirestore } from 'firebase-admin/firestore';
import { normalizeContact } from './contact';

/** Finds the canonical signup for a normalized contact (handles legacy casing). */
export async function findSignupByContact(contactValue: string) {
  const db = getFirestore();
  const q = await db
    .collection('signups')
    .where('contact', '==', contactValue)
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();
  if (!q.empty) {
    return q.docs[0];
  }

  // Legacy rows may have non-normalized email casing — scan recent signups.
  const recent = await db.collection('signups').orderBy('createdAt', 'desc').limit(200).get();
  for (const doc of recent.docs) {
    const raw = String(doc.data().contact ?? '');
    const parsed = normalizeContact(raw);
    if (parsed?.value === contactValue) {
      return doc;
    }
  }
  return null;
}
