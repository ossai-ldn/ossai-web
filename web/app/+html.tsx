import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Custom root HTML for the web build. Used to inject the crisp vector favicon
 * (with a raster .ico fallback for older browsers). This file is web-only and
 * runs in Node during static rendering.
 */
export default function Root({ children }: PropsWithChildren) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

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
                    dangerouslySetInnerHTML={{
                        __html: `
(function () {
  var path = location.pathname.replace(/\\/+$/,'') || '/';
  var gated = path === '/search' || path === '/shop' || path.indexOf('/shop/') === 0;
  if (!gated) return;
  var TTL = ${30 * 24 * 60 * 60 * 1000};
  try {
    var raw = localStorage.getItem('ossai_site_access');
    if (!raw) { location.replace('/'); return; }
    var p = JSON.parse(raw);
    if (!p.grantedAt || Date.now() - p.grantedAt >= TTL) location.replace('/');
  } catch (e) {
    location.replace('/');
  }
})();
`,
                    }}
                />

                <ScrollViewStyleReset />
            </head>
            <body>{children}</body>
        </html>
    );
}
