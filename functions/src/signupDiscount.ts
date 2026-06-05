import { getFirestore } from 'firebase-admin/firestore';
import { DEFAULT_DISCOUNT_PERCENT, generateDiscountCode } from './discount';
import { getAccessConfig } from './siteConfig';

export async function assignUniqueDiscount(signupId: string): Promise<{
  discountCode: string;
  discountPercent: number;
}> {
  const db = getFirestore();
  const config = await getAccessConfig();
  const discountPercent = config.defaultDiscountPercent ?? DEFAULT_DISCOUNT_PERCENT;

  for (let attempt = 0; attempt < 8; attempt++) {
    const discountCode = generateDiscountCode();
    const existing = await db
      .collection('signups')
      .where('discountCode', '==', discountCode)
      .limit(1)
      .get();
    if (!existing.empty) continue;

    await db.collection('signups').doc(signupId).update({
      discountCode,
      discountPercent,
    });
    return { discountCode, discountPercent };
  }
  throw new Error('Failed to generate unique discount code');
}

export async function ensureSignupDiscount(signupId: string): Promise<{
  discountCode: string;
  discountPercent: number;
}> {
  const db = getFirestore();
  const snap = await db.collection('signups').doc(signupId).get();
  if (!snap.exists) {
    throw new Error('Signup not found');
  }
  const d = snap.data()!;
  const existingCode = typeof d.discountCode === 'string' ? d.discountCode.trim() : '';
  if (existingCode) {
    return {
      discountCode: existingCode,
      discountPercent: Number(d.discountPercent ?? DEFAULT_DISCOUNT_PERCENT),
    };
  }
  return assignUniqueDiscount(signupId);
}
