import type { ContentPage, PageSection } from './siteTypes';

export const DEFAULT_ABOUT: ContentPage = {
  id: 'default-about',
  slug: 'about',
  title: 'About Ossai',
  active: true,
  sections: [
    { type: 'heading', title: 'Noun' },
    {
      type: 'text',
      body: 'Ossai is a contemporary fashion house rooted in quiet utility and sculptural form. Each piece is conceived as part of a private exhibition — limited, intentional, and made to endure.',
    },
    { type: 'heading', title: 'Adjective' },
    {
      type: 'text',
      body: 'Restrained. Precise. Considered. We work in muted palettes and generous proportions, privileging material honesty over spectacle.',
    },
    { type: 'heading', title: 'Description' },
    {
      type: 'text',
      body: 'Founded in London, Ossai releases seasonal drops through password-gated exhibitions. SS26 continues our exploration of perseverance — garments built for repetition, weather, and time.',
    },
  ],
};

export const DEFAULT_HELP: ContentPage = {
  id: 'default-help',
  slug: 'help',
  title: 'Help & FAQs',
  active: true,
  sections: [
    {
      type: 'text',
      body: 'For support, contact us at support@ossai.co.uk or message us on WhatsApp.',
    },
    { type: 'faq', title: 'Payments', body: 'We accept card, Apple Pay, Google Pay, Klarna, and Alipay via Shopify checkout.' },
    { type: 'faq', title: 'Shipping', body: 'UK standard delivery is free on orders over £100. International rates apply at checkout.' },
    { type: 'faq', title: 'Returns', body: 'Online returns are accepted within 19 days. Customer pays return postage unless the item is faulty.' },
    { type: 'faq', title: 'Discount codes', body: 'One discount code per order. Codes from our mailing list are unique to each subscriber.' },
    { type: 'faq', title: 'Back in stock', body: 'Use “Notify me” on sold-out sizes. We will email you when stock is restored.' },
    { type: 'faq', title: 'Reviews', body: 'Product reviews are available on each piece page after purchase.' },
  ],
};

export const DEFAULT_POLICIES: Record<string, ContentPage> = {
  terms: {
    id: 'default-terms',
    slug: 'terms',
    title: 'Terms of Service',
    active: true,
    sections: [
      {
        type: 'text',
        body: 'By accessing ossai.co.uk you agree to these terms. Purchases are subject to availability. One promotional code per order. Sale items may be excluded from further discounts at our discretion.',
      },
    ],
  },
  privacy: {
    id: 'default-privacy',
    slug: 'privacy',
    title: 'Privacy Policy',
    active: true,
    sections: [
      {
        type: 'text',
        body: 'We collect contact information when you join our mailing list or place an order. Data is used to fulfil orders, send drop notifications, and improve our service. We do not sell your data.',
      },
    ],
  },
  shipping: {
    id: 'default-shipping',
    slug: 'shipping',
    title: 'Shipping Policy',
    active: true,
    sections: [
      {
        type: 'text',
        body: 'Orders ship from the UK. Standard UK delivery typically takes 2–4 business days. Express and international options are shown at checkout.',
      },
    ],
  },
  returns: {
    id: 'default-returns',
    slug: 'returns',
    title: 'Returns & Refunds',
    active: true,
    sections: [
      {
        type: 'text',
        body: 'You may return unworn items within 19 days of delivery. Initiate a return via support@ossai.co.uk. Refunds are processed within 5–10 business days of receipt.',
      },
    ],
  },
};

export function mergePage(defaultPage: ContentPage, remote: ContentPage | null): ContentPage {
  if (!remote || remote.sections.length === 0) return defaultPage;
  return remote;
}
