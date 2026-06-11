import Head from 'expo-router/head';
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  canonicalUrl,
  formatTitle,
} from '../lib/seo';

type Props = {
  title: string;
  description: string;
  path?: string;
  noindex?: boolean;
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

export default function SeoHead({
  title,
  description,
  path = '/',
  noindex = false,
  ogImage = DEFAULT_OG_IMAGE,
  jsonLd,
}: Props) {
  const pageTitle = formatTitle(title);
  const url = canonicalUrl(path);

  return (
    <Head>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="en_GB" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
      ) : null}
    </Head>
  );
}
