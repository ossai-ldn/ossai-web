import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { normalizeContact } from './contact';
import { DEFAULT_DISCOUNT_PERCENT } from './discount';
import { productPayloadFromRequest, slugify } from './productUtils';
import { findSignupByContact } from './signupLookup';
import { assignUniqueDiscount, ensureSignupDiscount } from './signupDiscount';
import { getAccessConfig, publicConfigFromAccess, setAccessConfig } from './siteConfig';

const ADMIN_SECRET = defineSecret('ADMIN_SECRET');

const REGION = 'europe-west2';

function assertAdmin(secret: string | undefined) {
  const expected = ADMIN_SECRET.value();
  if (!expected || secret !== expected) {
    throw new HttpsError('permission-denied', 'Invalid admin credentials.');
  }
}

function discountResponse(doc: FirebaseFirestore.QueryDocumentSnapshot) {
  const d = doc.data();
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
  const db = getFirestore();
  const contactRaw =
    typeof request.data?.contact === 'string' ? request.data.contact.trim() : '';
  const parsed = normalizeContact(contactRaw);
  if (!parsed) {
    throw new HttpsError('invalid-argument', 'Enter a valid email or phone number.');
  }

  const source =
    typeof request.data?.source === 'string'
      ? request.data.source.trim().slice(0, 100)
      : 'web-landing';
  const userAgent =
    typeof request.data?.userAgent === 'string'
      ? request.data.userAgent.trim().slice(0, 1000)
      : '';

  const existing = await findSignupByContact(parsed.value);
  if (existing) {
    await existing.ref.update({ contact: parsed.value, type: parsed.type });
    const { discountCode, discountPercent } = await ensureSignupDiscount(existing.id);
    return {
      signupId: existing.id,
      existing: true as const,
      discountCode,
      discountPercent,
      contact: parsed.value,
    };
  }

  const ref = await db.collection('signups').add({
    contact: parsed.value,
    type: parsed.type,
    source,
    userAgent,
    createdAt: FieldValue.serverTimestamp(),
  });

  const { discountCode, discountPercent } = await assignUniqueDiscount(ref.id);

  return {
    signupId: ref.id,
    existing: false as const,
    discountCode,
    discountPercent,
    contact: parsed.value,
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

/** Public site config for announcement bar, promos, featured collection. */
export const getPublicSiteConfig = onCall({ region: REGION }, async () => {
  const config = await getAccessConfig();
  return publicConfigFromAccess(config);
});

/** Register back-in-stock alert for a variant. */
export const registerRestockAlert = onCall({ region: REGION }, async (request) => {
  const db = getFirestore();
  const productId = typeof request.data?.productId === 'string' ? request.data.productId.trim() : '';
  const variantId = typeof request.data?.variantId === 'string' ? request.data.variantId.trim() : '';
  const emailRaw = typeof request.data?.email === 'string' ? request.data.email.trim() : '';
  const parsed = normalizeContact(emailRaw);
  if (!productId || !variantId || !parsed || parsed.type !== 'email') {
    throw new HttpsError('invalid-argument', 'productId, variantId, and valid email required.');
  }

  const existing = await db
    .collection('restockAlerts')
    .where('productId', '==', productId)
    .where('variantId', '==', variantId)
    .where('email', '==', parsed.value)
    .where('notified', '==', false)
    .limit(1)
    .get();

  if (!existing.empty) {
    return { ok: true, existing: true };
  }

  await db.collection('restockAlerts').add({
    productId,
    variantId,
    email: parsed.value,
    notified: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { ok: true, existing: false };
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

  const code = String(doc.data().discountCode ?? '').trim();
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
    case 'setSitePromos': {
      const partial: Record<string, unknown> = {};
      if (typeof request.data?.shippingPromoText === 'string') {
        partial.shippingPromoText = request.data.shippingPromoText.trim().slice(0, 200);
      }
      if (typeof request.data?.newsletterPromoText === 'string') {
        partial.newsletterPromoText = request.data.newsletterPromoText.trim().slice(0, 300);
      }
      if (typeof request.data?.featuredCollectionHandle === 'string') {
        partial.featuredCollectionHandle = request.data.featuredCollectionHandle.trim().slice(0, 64);
      }
      if (request.data?.announcementBar && typeof request.data.announcementBar === 'object') {
        const bar = request.data.announcementBar as Record<string, unknown>;
        partial.announcementBar = {
          enabled: bar.enabled !== false,
          messages: Array.isArray(bar.messages) ? bar.messages : [],
        };
      }
      const config = await setAccessConfig(partial);
      return { config };
    }
    case 'listCollections': {
      const snap = await db.collection('collections').orderBy('sortOrder', 'asc').get();
      return { collections: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
    }
    case 'upsertCollection': {
      const id = typeof request.data?.collectionId === 'string' ? request.data.collectionId : '';
      const handle =
        typeof request.data?.handle === 'string'
          ? request.data.handle.trim().toLowerCase()
          : '';
      const title = typeof request.data?.title === 'string' ? request.data.title.trim() : '';
      if (!handle || !title) {
        throw new HttpsError('invalid-argument', 'handle and title required.');
      }
      const payload = {
        handle,
        title,
        description:
          typeof request.data?.description === 'string' ? request.data.description.trim() : '',
        heroImageUrl:
          typeof request.data?.heroImageUrl === 'string' ? request.data.heroImageUrl.trim() : '',
        seasonLabel:
          typeof request.data?.seasonLabel === 'string' ? request.data.seasonLabel.trim() : '',
        sortOrder: Number(request.data?.sortOrder ?? 0),
        active: request.data?.active !== false,
        updatedAt: new Date(),
      };
      if (id) {
        await db.collection('collections').doc(id).set(payload, { merge: true });
        return { collectionId: id };
      }
      const ref = await db.collection('collections').add({ ...payload, createdAt: new Date() });
      return { collectionId: ref.id };
    }
    case 'deleteCollection': {
      const collectionId =
        typeof request.data?.collectionId === 'string' ? request.data.collectionId : '';
      if (!collectionId) throw new HttpsError('invalid-argument', 'collectionId required.');
      await db.collection('collections').doc(collectionId).delete();
      return { ok: true };
    }
    case 'listPages': {
      const snap = await db.collection('pages').orderBy('slug', 'asc').get();
      return { pages: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
    }
    case 'upsertPage': {
      const id = typeof request.data?.pageId === 'string' ? request.data.pageId : '';
      const slug =
        typeof request.data?.slug === 'string' ? request.data.slug.trim().toLowerCase() : '';
      const title = typeof request.data?.title === 'string' ? request.data.title.trim() : '';
      if (!slug || !title) {
        throw new HttpsError('invalid-argument', 'slug and title required.');
      }
      const payload = {
        slug,
        title,
        sections: Array.isArray(request.data?.sections) ? request.data.sections : [],
        active: request.data?.active !== false,
        updatedAt: new Date(),
      };
      if (id) {
        await db.collection('pages').doc(id).set(payload, { merge: true });
        return { pageId: id };
      }
      const ref = await db.collection('pages').add({ ...payload, createdAt: new Date() });
      return { pageId: ref.id };
    }
    case 'listPress': {
      const snap = await db.collection('pressItems').orderBy('sortOrder', 'asc').get();
      return { pressItems: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
    }
    case 'upsertPress': {
      const id = typeof request.data?.pressId === 'string' ? request.data.pressId : '';
      const quote = typeof request.data?.quote === 'string' ? request.data.quote.trim() : '';
      if (!quote) throw new HttpsError('invalid-argument', 'quote required.');
      const payload = {
        quote,
        source: typeof request.data?.source === 'string' ? request.data.source.trim() : '',
        url: typeof request.data?.url === 'string' ? request.data.url.trim() : '',
        sortOrder: Number(request.data?.sortOrder ?? 0),
        active: request.data?.active !== false,
        updatedAt: new Date(),
      };
      if (id) {
        await db.collection('pressItems').doc(id).set(payload, { merge: true });
        return { pressId: id };
      }
      const ref = await db.collection('pressItems').add({ ...payload, createdAt: new Date() });
      return { pressId: ref.id };
    }
    case 'deletePress': {
      const pressId = typeof request.data?.pressId === 'string' ? request.data.pressId : '';
      if (!pressId) throw new HttpsError('invalid-argument', 'pressId required.');
      await db.collection('pressItems').doc(pressId).delete();
      return { ok: true };
    }
    case 'listArchives': {
      const snap = await db.collection('archives').orderBy('sortOrder', 'asc').get();
      return { archives: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
    }
    case 'upsertArchive': {
      const id = typeof request.data?.archiveId === 'string' ? request.data.archiveId : '';
      const title = typeof request.data?.title === 'string' ? request.data.title.trim() : '';
      if (!title) throw new HttpsError('invalid-argument', 'title required.');
      const payload = {
        title,
        season: typeof request.data?.season === 'string' ? request.data.season.trim() : '',
        url: typeof request.data?.url === 'string' ? request.data.url.trim() : '',
        sortOrder: Number(request.data?.sortOrder ?? 0),
        active: request.data?.active !== false,
        updatedAt: new Date(),
      };
      if (id) {
        await db.collection('archives').doc(id).set(payload, { merge: true });
        return { archiveId: id };
      }
      const ref = await db.collection('archives').add({ ...payload, createdAt: new Date() });
      return { archiveId: ref.id };
    }
    case 'deleteArchive': {
      const archiveId = typeof request.data?.archiveId === 'string' ? request.data.archiveId : '';
      if (!archiveId) throw new HttpsError('invalid-argument', 'archiveId required.');
      await db.collection('archives').doc(archiveId).delete();
      return { ok: true };
    }
    case 'listRestockAlerts': {
      const snap = await db
        .collection('restockAlerts')
        .where('notified', '==', false)
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();
      return {
        alerts: snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toMillis?.() ?? null,
        })),
      };
    }
    case 'markRestockNotified': {
      const alertId = typeof request.data?.alertId === 'string' ? request.data.alertId : '';
      if (!alertId) throw new HttpsError('invalid-argument', 'alertId required.');
      await db.collection('restockAlerts').doc(alertId).update({ notified: true });
      return { ok: true };
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
        if (parsed) {
          await keeper.ref.update({ contact: parsed.value, type: parsed.type });
        }

        for (let i = 1; i < docs.length; i++) {
          await docs[i].ref.delete();
          merged++;
        }

        const code = String(keeper.data().discountCode ?? '').trim();
        if (!code) {
          await ensureSignupDiscount(keeper.id);
          codesAssigned++;
        }
      }

      return { ok: true, merged, codesAssigned, contacts: byContact.size };
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
