import { getFirestore } from 'firebase-admin/firestore';

const ACCESS_DOC = 'siteConfig/access';

export interface AccessConfig {
  sitePassword: string;
  shopLive: boolean;
  defaultDiscountPercent: number;
}

const DEFAULTS: AccessConfig = {
  sitePassword: 'OSSAI10',
  shopLive: false,
  defaultDiscountPercent: 10,
};

export async function getAccessConfig(): Promise<AccessConfig> {
  const snap = await getFirestore().doc(ACCESS_DOC).get();
  if (!snap.exists) {
    return { ...DEFAULTS };
  }
  const d = snap.data()!;
  return {
    sitePassword: typeof d.sitePassword === 'string' ? d.sitePassword : DEFAULTS.sitePassword,
    shopLive: d.shopLive === true,
    defaultDiscountPercent:
      typeof d.defaultDiscountPercent === 'number'
        ? Math.min(100, Math.max(0, Math.round(d.defaultDiscountPercent)))
        : DEFAULTS.defaultDiscountPercent,
  };
}

export async function setAccessConfig(partial: Partial<AccessConfig>): Promise<AccessConfig> {
  const current = await getAccessConfig();
  const next: AccessConfig = { ...current, ...partial };
  await getFirestore()
    .doc(ACCESS_DOC)
    .set(
      {
        sitePassword: next.sitePassword,
        shopLive: next.shopLive,
        defaultDiscountPercent: next.defaultDiscountPercent,
        updatedAt: new Date(),
      },
      { merge: true },
    );
  return next;
}
