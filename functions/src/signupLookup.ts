import { getFirestore } from 'firebase-admin/firestore';
import { normalizeContact } from './contact';
import { signupDocId } from './signupId';

/** Finds the canonical signup for a normalized contact (handles legacy casing). */
export async function findSignupByContact(contactValue: string) {
  const db = getFirestore();
  const direct = await db.collection('signups').doc(signupDocId(contactValue)).get();
  if (direct.exists) {
    return direct;
  }

  const q = await db.collection('signups').where('contact', '==', contactValue).limit(10).get();
  if (!q.empty) {
    const sorted = [...q.docs].sort((a, b) => {
      const aTime = a.data().createdAt?.toMillis?.() ?? 0;
      const bTime = b.data().createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
    return sorted[0];
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
