import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { normalizeContact } from './contact';
import { DEFAULT_DISCOUNT_PERCENT } from './discount';
import { productPayloadFromRequest, slugify } from './productUtils';
import { createProductUploadUrl } from './productUpload';
import { findSignupByContact } from './signupLookup';
import { ensureCanonicalSignupDoc } from './signupMigrate';
import { createLinkToken, signupDocId } from './signupId';
import { assignUniqueDiscount, ensureSignupDiscount } from './signupDiscount';
import { getAccessConfig, setAccessConfig } from './siteConfig';

const ADMIN_SECRET = defineSecret('ADMIN_SECRET');

const REGION = 'europe-west2';

function assertAdmin(secret: string | undefined) {
  const expected = ADMIN_SECRET.value();
  if (!expected || secret !== expected) {
    throw new HttpsError('permission-denied', 'Invalid admin credentials.');
  }
}

function discountResponse(doc: FirebaseFirestore.DocumentSnapshot) {
  const d = doc.data();
  if (!d) {
    throw new HttpsError('not-found', 'Signup not found.');
  }
  const code = typeof d.discountCode === 'string' ? d.discountCode.trim() : '';
  return {
    discountCode: code,
    discountPercent: Number(d.discountPercent ?? DEFAULT_DISCOUNT_PERCENT),
    contact: String(d.contact ?? ''),
    signupId: doc.id,
  };
}

/** Creates or returns existing signup (deduped by normalized contact). */
export const registerSignup = onCall({ region: REGION }, async (request) => {
  try {
    const db = getFirestore();
    const contactRaw =
      typeof request.data?.contact === 'string' ? request.data.contact.trim() : '';
    const parsed = normalizeContact(contactRaw);
    if (!parsed) {
      throw new HttpsError(
        'invalid-argument',
        'Enter a valid email or UK/international phone (e.g. 07… or +44 7…).',
      );
    }

    const source =
      typeof request.data?.source === 'string'
        ? request.data.source.trim().slice(0, 100)
        : 'web-landing';
    const userAgent =
      typeof request.data?.userAgent === 'string'
        ? request.data.userAgent.trim().slice(0, 1000)
        : '';

    await ensureCanonicalSignupDoc(parsed.value, parsed.type);
    const docId = signupDocId(parsed.value);
    const ref = db.collection('signups').doc(docId);
    const snap = await ref.get();

    if (snap.exists) {
      const data = snap.data()!;
      const linkToken =
        typeof data.linkToken === 'string' && data.linkToken.trim()
          ? data.linkToken.trim()
          : createLinkToken();
      await ref.update({
        contact: parsed.value,
        type: parsed.type,
        linkToken,
        lastSeenAt: FieldValue.serverTimestamp(),
      });
      const { discountCode, discountPercent } = await ensureSignupDiscount(docId);
      return {
        signupId: docId,
        existing: true as const,
        discountCode,
        discountPercent,
        contact: parsed.value,
      };
    }

    const linkToken = createLinkToken();
    await ref.set({
      contact: parsed.value,
      type: parsed.type,
      source,
      userAgent,
      linkToken,
      createdAt: FieldValue.serverTimestamp(),
    });

    const { discountCode, discountPercent } = await assignUniqueDiscount(docId);

    return {
      signupId: docId,
      existing: false as const,
      discountCode,
      discountPercent,
      contact: parsed.value,
    };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    console.error('registerSignup failed', err);
    throw new HttpsError(
      'internal',
      err instanceof Error ? err.message : 'Signup failed. Please try again.',
    );
  }
});

/** Verifies email/SMS magic link and returns discount for browser linking. */
export const verifyWelcomeLink = onCall({ region: REGION }, async (request) => {
  const db = getFirestore();
  const signupId =
    typeof request.data?.signupId === 'string' ? request.data.signupId.trim() : '';
  const token = typeof request.data?.token === 'string' ? request.data.token.trim() : '';

  if (!signupId || !token || token.length < 16) {
    throw new HttpsError('invalid-argument', 'Invalid welcome link.');
  }

  const snap = await db.collection('signups').doc(signupId).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Signup not found.');
  }

  const stored = String(snap.data()?.linkToken ?? '').trim();
  if (!stored || stored !== token) {
    throw new HttpsError('permission-denied', 'Invalid or expired welcome link.');
  }

  const { discountCode, discountPercent } = await ensureSignupDiscount(signupId);
  return {
    signupId,
    discountCode,
    discountPercent,
    contact: String(snap.data()?.contact ?? ''),
  };
});

/** Verifies the global site password and returns shop live status. */
export const verifySitePassword = onCall({ region: REGION }, async (request) => {
  const password = typeof request.data?.password === 'string' ? request.data.password.trim() : '';
  if (!password) {
    throw new HttpsError('invalid-argument', 'Password is required.');
  }
  const config = await getAccessConfig();
  if (password !== config.sitePassword) {
    throw new HttpsError('permission-denied', 'Invalid password.');
  }
  return { ok: true as const, shopLive: config.shopLive };
});

/** Returns whether the shop is currently live (no password needed). */
export const getSiteStatus = onCall({ region: REGION }, async () => {
  const config = await getAccessConfig();
  return { shopLive: config.shopLive };
});

/** Looks up a signup discount by id or contact (email/phone). */
export const getMyDiscount = onCall({ region: REGION }, async (request) => {
  const db = getFirestore();
  const signupId =
    typeof request.data?.signupId === 'string' ? request.data.signupId.trim() : '';
  const contactRaw =
    typeof request.data?.contact === 'string' ? request.data.contact.trim() : '';

  if (signupId) {
    const snap = await db.collection('signups').doc(signupId).get();
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Signup not found.');
    }
    const code = String(snap.data()?.discountCode ?? '').trim();
    if (!code) {
      const assigned = await ensureSignupDiscount(signupId);
      return {
        ...assigned,
        contact: String(snap.data()?.contact ?? ''),
        signupId,
      };
    }
    const d = snap.data()!;
    return {
      discountCode: code,
      discountPercent: Number(d.discountPercent ?? DEFAULT_DISCOUNT_PERCENT),
      contact: String(d.contact ?? ''),
      signupId,
    };
  }

  const parsed = normalizeContact(contactRaw);
  if (!parsed) {
    throw new HttpsError('invalid-argument', 'Provide signupId or a valid email/phone.');
  }

  const doc = await findSignupByContact(parsed.value);
  if (!doc) {
    throw new HttpsError('not-found', 'No signup found for this contact.');
  }

  const docData = doc.data();
  if (!docData) {
    throw new HttpsError('not-found', 'No signup found for this contact.');
  }

  const code = String(docData.discountCode ?? '').trim();
  if (!code) {
    const assigned = await ensureSignupDiscount(doc.id);
    return { ...assigned, contact: parsed.value, signupId: doc.id };
  }

  return discountResponse(doc);
});

/** Admin: site password, shop live/offline, signup discounts, products. */
export const adminApi = onCall({ region: REGION, secrets: [ADMIN_SECRET] }, async (request) => {
  assertAdmin(typeof request.data?.adminSecret === 'string' ? request.data.adminSecret : undefined);
  const action = typeof request.data?.action === 'string' ? request.data.action : '';
  const db = getFirestore();

  switch (action) {
    case 'getConfig': {
      const config = await getAccessConfig();
      return { config };
    }
    case 'setSitePassword': {
      const sitePassword =
        typeof request.data?.sitePassword === 'string' ? request.data.sitePassword.trim() : '';
      if (!sitePassword || sitePassword.length > 64) {
        throw new HttpsError('invalid-argument', 'Invalid site password.');
      }
      const config = await setAccessConfig({ sitePassword });
      return { config };
    }
    case 'setShopLive': {
      const config = await setAccessConfig({ shopLive: true });
      return { config };
    }
    case 'setShopOffline': {
      const config = await setAccessConfig({ shopLive: false });
      return { config };
    }
    case 'backfillSignups': {
      const snap = await db.collection('signups').orderBy('createdAt', 'desc').limit(500).get();
      const byContact = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();

      for (const doc of snap.docs) {
        const raw = String(doc.data().contact ?? '');
        const parsed = normalizeContact(raw);
        if (!parsed) continue;
        const list = byContact.get(parsed.value) ?? [];
        list.push(doc);
        byContact.set(parsed.value, list);
      }

      let merged = 0;
      let codesAssigned = 0;
      let phonesFixed = 0;
      let migrated = 0;

      for (const [, docs] of byContact) {
        docs.sort((a, b) => {
          const aCode = String(a.data().discountCode ?? '').trim();
          const bCode = String(b.data().discountCode ?? '').trim();
          if (aCode && !bCode) return -1;
          if (!aCode && bCode) return 1;
          const aTime = a.data().createdAt?.toMillis?.() ?? 0;
          const bTime = b.data().createdAt?.toMillis?.() ?? 0;
          return bTime - aTime;
        });

        const keeper = docs[0];
        const parsed = normalizeContact(String(keeper.data().contact ?? ''));
        if (!parsed) continue;

        const prev = String(keeper.data().contact ?? '');
        if (parsed.type === 'phone' && prev !== parsed.value) phonesFixed++;
        await keeper.ref.update({ contact: parsed.value, type: parsed.type });

        for (let i = 1; i < docs.length; i++) {
          await docs[i].ref.delete();
          merged++;
        }

        const { migrated: didMigrate, ref: canonicalRef } = await ensureCanonicalSignupDoc(
          parsed.value,
          parsed.type,
        );
        if (didMigrate) migrated++;

        const canonicalSnap = await canonicalRef.get();
        const data = canonicalSnap.data() ?? {};
        if (!data.linkToken) {
          await canonicalRef.update({ linkToken: createLinkToken() });
        }

        const code = String(data.discountCode ?? '').trim();
        if (!code) {
          await ensureSignupDiscount(canonicalRef.id);
          codesAssigned++;
        }
      }

      return { ok: true, merged, codesAssigned, phonesFixed, migrated, contacts: byContact.size };
    }
    case 'listSignups': {
      const snap = await db.collection('signups').orderBy('createdAt', 'desc').limit(100).get();
      return {
        signups: snap.docs.map((doc) => ({
          id: doc.id,
          contact: doc.data().contact,
          type: doc.data().type,
          discountCode: doc.data().discountCode ?? '',
          discountPercent: doc.data().discountPercent ?? DEFAULT_DISCOUNT_PERCENT,
          createdAt: doc.data().createdAt?.toMillis?.() ?? null,
        })),
      };
    }
    case 'updateSignup': {
      const id = typeof request.data?.signupId === 'string' ? request.data.signupId : '';
      if (!id) throw new HttpsError('invalid-argument', 'signupId required.');
      const updates: Record<string, unknown> = {};
      if (typeof request.data?.discountCode === 'string') {
        updates.discountCode = request.data.discountCode.trim().slice(0, 32);
      }
      if (typeof request.data?.discountPercent === 'number') {
        updates.discountPercent = Math.min(100, Math.max(0, Math.round(request.data.discountPercent)));
      }
      if (Object.keys(updates).length === 0) {
        throw new HttpsError('invalid-argument', 'Nothing to update.');
      }
      await db.collection('signups').doc(id).update(updates);
      return { ok: true };
    }
    case 'listProducts': {
      const snap = await db.collection('products').orderBy('sortOrder', 'asc').get();
      return {
        products: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      };
    }
    case 'getProduct': {
      const productId =
        typeof request.data?.productId === 'string' ? request.data.productId : '';
      if (!productId) throw new HttpsError('invalid-argument', 'productId required.');
      const snap = await db.collection('products').doc(productId).get();
      if (!snap.exists) throw new HttpsError('not-found', 'Product not found.');
      return { product: { id: snap.id, ...snap.data() } };
    }
    case 'upsertProduct': {
      const id = typeof request.data?.productId === 'string' ? request.data.productId : '';
      let existing: Record<string, unknown> | undefined;
      if (id) {
        const snap = await db.collection('products').doc(id).get();
        if (!snap.exists) throw new HttpsError('not-found', 'Product not found.');
        existing = snap.data();
      }

      const payload = productPayloadFromRequest(request.data as Record<string, unknown>, existing);
      if (!payload) {
        throw new HttpsError('invalid-argument', 'title and shopifyUrl required.');
      }

      if (!payload.slug) payload.slug = slugify(payload.title);

      const slugConflict = await db
        .collection('products')
        .where('slug', '==', payload.slug)
        .limit(2)
        .get();
      const conflict = slugConflict.docs.find((d) => d.id !== id);
      if (conflict) {
        payload.slug = `${payload.slug}-${Date.now().toString(36).slice(-4)}`;
      }

      if (payload.stockQty === 0 && request.data?.soldOut !== false) {
        payload.soldOut = true;
      }

      if (id) {
        await db.collection('products').doc(id).set(payload, { merge: true });
        return { productId: id };
      }
      const ref = await db.collection('products').add({
        ...payload,
        createdAt: new Date(),
      });
      return { productId: ref.id };
    }
    case 'getProductUploadUrl': {
      const slot = typeof request.data?.slot === 'string' ? request.data.slot.trim() : '';
      const contentType =
        typeof request.data?.contentType === 'string' ? request.data.contentType.trim() : '';
      const productId =
        typeof request.data?.productId === 'string' ? request.data.productId.trim() : '';
      const fileName =
        typeof request.data?.fileName === 'string' ? request.data.fileName.trim() : '';
      if (!slot || !contentType) {
        throw new HttpsError('invalid-argument', 'slot and contentType required.');
      }
      try {
        return await createProductUploadUrl({ slot, contentType, productId, fileName });
      } catch (err) {
        throw new HttpsError(
          'invalid-argument',
          err instanceof Error ? err.message : 'Invalid upload request.',
        );
      }
    }
    case 'deleteProduct': {
      const productId =
        typeof request.data?.productId === 'string' ? request.data.productId : '';
      if (!productId) throw new HttpsError('invalid-argument', 'productId required.');
      await db.collection('products').doc(productId).delete();
      return { ok: true };
    }
    default:
      throw new HttpsError('invalid-argument', `Unknown action: ${action}`);
  }
});
