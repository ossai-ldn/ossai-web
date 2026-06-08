import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { createLinkToken, signupDocId } from './signupId';
import { findSignupByContact } from './signupLookup';

/** Moves a legacy random-id signup onto the deterministic doc id if needed. */
export async function ensureCanonicalSignupDoc(normalizedContact: string, type: 'email' | 'phone') {
  const db = getFirestore();
  const docId = signupDocId(normalizedContact);
  const canonicalRef = db.collection('signups').doc(docId);
  const canonicalSnap = await canonicalRef.get();

  if (canonicalSnap.exists) {
    return { ref: canonicalRef, snap: canonicalSnap, migrated: false };
  }

  const legacy = await findSignupByContact(normalizedContact);
  if (!legacy || legacy.id === docId) {
    return { ref: canonicalRef, snap: canonicalSnap, migrated: false };
  }

  const data = legacy.data();
  if (!data) {
    return { ref: canonicalRef, snap: canonicalSnap, migrated: false };
  }

  const linkToken =
    typeof data.linkToken === 'string' && data.linkToken.trim()
      ? data.linkToken.trim()
      : createLinkToken();

  await canonicalRef.set({
    contact: normalizedContact,
    type,
    source: data.source ?? 'web-landing',
    userAgent: data.userAgent ?? '',
    linkToken,
    discountCode: data.discountCode ?? '',
    discountPercent: data.discountPercent ?? 10,
    welcomeSent: data.welcomeSent === true,
    createdAt: data.createdAt ?? FieldValue.serverTimestamp(),
    migratedFrom: legacy.id,
    migratedAt: FieldValue.serverTimestamp(),
  });

  await legacy.ref.delete();

  const snap = await canonicalRef.get();
  return { ref: canonicalRef, snap, migrated: true };
}
