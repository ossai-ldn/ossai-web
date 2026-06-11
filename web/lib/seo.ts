export const SITE_URL = 'https://ossai.co.uk';
export const SITE_NAME = 'OSSAI';
export const DEFAULT_DESCRIPTION =
  'OSSAI is a London contemporary fashion house. Sign up for private exhibitions, limited drops, and exclusive access.';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

export type PageSeo = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
};

export const pages: Record<string, PageSeo> = {
  home: {
    title: 'OSSAI — Contemporary Fashion | London',
    description: DEFAULT_DESCRIPTION,
    path: '/',
  },
  shop: {
    title: 'Shop — OSSAI',
    description: 'Browse the OSSAI exhibition shop. Limited pieces and private access.',
    path: '/shop',
    noindex: true,
  },
  admin: {
    title: 'Admin — OSSAI',
    description: 'OSSAI site administration.',
    path: '/admin',
    noindex: true,
  },
  welcome: {
    title: 'Welcome — OSSAI',
    description: 'Link your browser to your OSSAI signup.',
    path: '/welcome',
    noindex: true,
  },
};

export function canonicalUrl(path: string): string {
  if (!path || path === '/') return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function formatTitle(title: string): string {
  if (title.toUpperCase().includes('OSSAI')) return title;
  return `${title} | ${SITE_NAME}`;
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    description: DEFAULT_DESCRIPTION,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'London',
      addressCountry: 'GB',
    },
  };
}

export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/shop?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}
