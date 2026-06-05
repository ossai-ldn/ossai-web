export type AnnouncementMessage = {
  text: string;
  link?: string;
};

export type PublicSiteConfig = {
  shopLive: boolean;
  announcementBar: {
    enabled: boolean;
    messages: AnnouncementMessage[];
  };
  shippingPromoText: string;
  newsletterPromoText: string;
  featuredCollectionHandle: string;
};

export type Collection = {
  id: string;
  handle: string;
  title: string;
  description: string;
  heroImageUrl: string;
  active: boolean;
  sortOrder: number;
  seasonLabel: string;
};

export type PageSection = {
  type: 'text' | 'heading' | 'faq' | 'quote' | 'link';
  title?: string;
  body?: string;
  linkUrl?: string;
  linkLabel?: string;
};

export type ContentPage = {
  id: string;
  slug: string;
  title: string;
  sections: PageSection[];
  active: boolean;
};

export type PressItem = {
  id: string;
  quote: string;
  source: string;
  url: string;
  sortOrder: number;
  active: boolean;
};

export type ArchiveItem = {
  id: string;
  title: string;
  season: string;
  url: string;
  sortOrder: number;
  active: boolean;
};

export function mapCollectionDoc(id: string, d: Record<string, unknown>): Collection {
  return {
    id,
    handle: String(d.handle ?? id),
    title: String(d.title ?? ''),
    description: String(d.description ?? ''),
    heroImageUrl: String(d.heroImageUrl ?? ''),
    active: d.active !== false,
    sortOrder: Number(d.sortOrder ?? 0),
    seasonLabel: String(d.seasonLabel ?? ''),
  };
}

export function mapPageDoc(id: string, d: Record<string, unknown>): ContentPage {
  const sections = Array.isArray(d.sections)
    ? (d.sections as PageSection[])
    : [];
  return {
    id,
    slug: String(d.slug ?? id),
    title: String(d.title ?? ''),
    sections,
    active: d.active !== false,
  };
}

export function mapPressDoc(id: string, d: Record<string, unknown>): PressItem {
  return {
    id,
    quote: String(d.quote ?? ''),
    source: String(d.source ?? ''),
    url: String(d.url ?? ''),
    sortOrder: Number(d.sortOrder ?? 0),
    active: d.active !== false,
  };
}

export function mapArchiveDoc(id: string, d: Record<string, unknown>): ArchiveItem {
  return {
    id,
    title: String(d.title ?? ''),
    season: String(d.season ?? ''),
    url: String(d.url ?? ''),
    sortOrder: Number(d.sortOrder ?? 0),
    active: d.active !== false,
  };
}
