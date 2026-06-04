import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { DEFAULT_DISCOUNT_PERCENT } from './discount';
import { getAccessConfig, setAccessConfig } from './siteConfig';

const ADMIN_SECRET = defineSecret('ADMIN_SECRET');

const REGION = 'europe-west2';

function normalizeContact(raw: string): { type: 'email' | 'phone'; value: string } | null {
  const trimmed = raw.trim();
  if (trimmed.includes('@')) {
    const email = trimmed.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return { type: 'email', value: email };
  }
  const digits = (trimmed.match(/\d/g) ?? []).length;
  if (digits >= 7 && /^\+?[0-9\s().-]{7,}$/.test(trimmed)) {
    const normalized = trimmed.startsWith('+')
      ? '+' + trimmed.slice(1).replace(/\D/g, '')
      : trimmed.replace(/\D/g, '');
    return { type: 'phone', value: normalized };
  }
  return null;
}

function assertAdmin(secret: string | undefined) {
  const expected = ADMIN_SECRET.value();
  if (!expected || secret !== expected) {
    throw new HttpsError('permission-denied', 'Invalid admin credentials.');
  }
}

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
    const d = snap.data()!;
    return {
      discountCode: String(d.discountCode ?? ''),
      discountPercent: Number(d.discountPercent ?? DEFAULT_DISCOUNT_PERCENT),
      contact: String(d.contact ?? ''),
    };
  }

  const parsed = normalizeContact(contactRaw);
  if (!parsed) {
    throw new HttpsError('invalid-argument', 'Provide signupId or a valid email/phone.');
  }

  const field = parsed.type === 'email' ? 'contact' : 'contact';
  const q = await db
    .collection('signups')
    .where(field, '==', parsed.value)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (q.empty) {
    throw new HttpsError('not-found', 'No signup found for this contact.');
  }
  const d = q.docs[0].data();
  return {
    discountCode: String(d.discountCode ?? ''),
    discountPercent: Number(d.discountPercent ?? DEFAULT_DISCOUNT_PERCENT),
    contact: String(d.contact ?? ''),
    signupId: q.docs[0].id,
  };
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
    case 'listSignups': {
      const snap = await db.collection('signups').orderBy('createdAt', 'desc').limit(100).get();
      return {
        signups: snap.docs.map((doc) => ({
          id: doc.id,
          contact: doc.data().contact,
          type: doc.data().type,
          discountCode: doc.data().discountCode,
          discountPercent: doc.data().discountPercent,
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
    case 'upsertProduct': {
      const id = typeof request.data?.productId === 'string' ? request.data.productId : '';
      const title = typeof request.data?.title === 'string' ? request.data.title.trim() : '';
      const shopifyUrl =
        typeof request.data?.shopifyUrl === 'string' ? request.data.shopifyUrl.trim() : '';
      if (!title || !shopifyUrl) {
        throw new HttpsError('invalid-argument', 'title and shopifyUrl required.');
      }
      const payload = {
        title,
        shopifyUrl,
        priceDisplay:
          typeof request.data?.priceDisplay === 'string' ? request.data.priceDisplay.trim() : '',
        imageUrl: typeof request.data?.imageUrl === 'string' ? request.data.imageUrl.trim() : '',
        sortOrder: Number(request.data?.sortOrder ?? 0),
        active: request.data?.active !== false,
        soldOut: request.data?.soldOut === true,
        updatedAt: new Date(),
      };
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
