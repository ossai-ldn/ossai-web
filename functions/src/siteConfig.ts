import { getFirestore } from 'firebase-admin/firestore';

const ACCESS_DOC = 'siteConfig/access';

export type AnnouncementMessage = {
  text: string;
  link?: string;
};

export interface AccessConfig {
  sitePassword: string;
  shopLive: boolean;
  defaultDiscountPercent: number;
  announcementBar: {
    enabled: boolean;
    messages: AnnouncementMessage[];
  };
  shippingPromoText: string;
  newsletterPromoText: string;
  featuredCollectionHandle: string;
}

const DEFAULTS: AccessConfig = {
  sitePassword: 'OSSAI10',
  shopLive: false,
  defaultDiscountPercent: 10,
  announcementBar: {
    enabled: true,
    messages: [
      { text: 'Preview SS26 — Private Exhibition Now Open', link: '/shop' },
      { text: 'Free UK Standard Delivery For Orders Over £100' },
      { text: 'Sign Up To Our Mailer For 15% Off' },
    ],
  },
  shippingPromoText: 'Free UK Standard Delivery For Orders Over £100',
  newsletterPromoText: 'Early access to drops and 15% off your first order.',
  featuredCollectionHandle: 'ss26',
};

function parseMessages(raw: unknown): AnnouncementMessage[] {
  if (!Array.isArray(raw)) return DEFAULTS.announcementBar.messages;
  const messages: AnnouncementMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue;
    const item = m as Record<string, unknown>;
    const text = typeof item.text === 'string' ? item.text.trim() : '';
    if (!text) continue;
    const link = typeof item.link === 'string' ? item.link.trim() : undefined;
    messages.push(link ? { text, link } : { text });
  }
  return messages.length > 0 ? messages : DEFAULTS.announcementBar.messages;
}

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
    announcementBar: {
      enabled: d.announcementBar?.enabled !== false,
      messages: parseMessages(d.announcementBar?.messages),
    },
    shippingPromoText:
      typeof d.shippingPromoText === 'string' ? d.shippingPromoText : DEFAULTS.shippingPromoText,
    newsletterPromoText:
      typeof d.newsletterPromoText === 'string'
        ? d.newsletterPromoText
        : DEFAULTS.newsletterPromoText,
    featuredCollectionHandle:
      typeof d.featuredCollectionHandle === 'string'
        ? d.featuredCollectionHandle
        : DEFAULTS.featuredCollectionHandle,
  };
}

export async function setAccessConfig(partial: Partial<AccessConfig>): Promise<AccessConfig> {
  const current = await getAccessConfig();
  const next: AccessConfig = { ...current, ...partial };
  if (partial.announcementBar) {
    next.announcementBar = {
      ...current.announcementBar,
      ...partial.announcementBar,
    };
  }
  await getFirestore()
    .doc(ACCESS_DOC)
    .set(
      {
        sitePassword: next.sitePassword,
        shopLive: next.shopLive,
        defaultDiscountPercent: next.defaultDiscountPercent,
        announcementBar: next.announcementBar,
        shippingPromoText: next.shippingPromoText,
        newsletterPromoText: next.newsletterPromoText,
        featuredCollectionHandle: next.featuredCollectionHandle,
        updatedAt: new Date(),
      },
      { merge: true },
    );
  return next;
}

export function publicConfigFromAccess(config: AccessConfig) {
  return {
    shopLive: config.shopLive,
    announcementBar: config.announcementBar,
    shippingPromoText: config.shippingPromoText,
    newsletterPromoText: config.newsletterPromoText,
    featuredCollectionHandle: config.featuredCollectionHandle,
  };
}
