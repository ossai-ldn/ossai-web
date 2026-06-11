import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';
import { organizationJsonLd, webSiteJsonLd } from '../lib/seo';

/**
 * Custom root HTML for the web build. Used to inject favicon, Brique font preload,
 * and fallback SEO tags (per-route Head overrides these at build time).
 */
export default function Root({ children }: PropsWithChildren) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
                <meta name="theme-color" content="#000000" />

                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
                <link rel="icon" type="image/x-icon" href="/favicon.ico" />
                <link rel="preload" href="/fonts/Brique-Regular.otf" as="font" type="font/otf" crossOrigin="" />
                <style
                    dangerouslySetInnerHTML={{
                        __html: `
@font-face {
  font-family: 'Brique';
  src: url('/fonts/Brique-Regular.otf') format('opentype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
`,
                    }}
                />

                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify([organizationJsonLd(), webSiteJsonLd()]),
                    }}
                />

                <ScrollViewStyleReset />
            </head>
            <body>{children}</body>
        </html>
    );
}
