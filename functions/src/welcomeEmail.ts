export interface WelcomeEmailOptions {
  siteUrl: string;
  allocationCode?: string;
  instagramUrl?: string;
}

/**
 * Renders the Ossai welcome email as email-safe HTML.
 *
 * Unlike the on-site landing page, email clients (Gmail, Outlook, Apple Mail)
 * do not run JavaScript and have poor/no support for flexbox, position:fixed,
 * backdrop-filter, viewport units, or web fonts. So this uses a centered
 * table layout with inline styles and web-safe serif fonts, and the allocation
 * code is shown as static text rather than a tap-to-copy control.
 */
export function renderWelcomeEmail(options: WelcomeEmailOptions): string {
  const {
    siteUrl,
    allocationCode = 'OSSAI10',
    instagramUrl = 'https://instagram.com',
  } = options;

  const bg = '#111112';
  const card = '#1c1c1e';
  const text = '#ffffff';
  const muted = '#8e8e93';
  const border = '#2c2c2e';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Ossai &mdash; Collective</title>
</head>
<body style="margin:0;padding:0;background-color:${bg};color:${text};-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${bg};">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" width="440" cellpadding="0" cellspacing="0" border="0" style="width:440px;max-width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:40px 0 28px 0;border-bottom:1px solid ${border};">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:34px;letter-spacing:8px;text-transform:uppercase;color:${text};line-height:1;">Ossai</div>
            </td>
          </tr>

          <!-- Manifesto -->
          <tr>
            <td align="center" style="padding:48px 16px;font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:11px;letter-spacing:5px;text-transform:uppercase;color:${muted};margin-bottom:24px;">The Philosophy</div>
              <p style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:21px;line-height:1.5;color:${text};margin:0 0 28px 0;">&ldquo;A deliberate study in contemporary form, quiet utility, and enduring structure.&rdquo;</p>
              <p style="font-size:14px;line-height:1.7;color:${muted};margin:0;">Ossai is built upon modern curation. We intentionally bridge the gap between architectural streetwear elements and meticulous garment tailoring. Each piece is constructed in limited quantities to respect creative longevity.</p>
            </td>
          </tr>

          <!-- Private Access card -->
          <tr>
            <td style="padding:0 0 48px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${border};background-color:${card};">
                <tr>
                  <td align="center" style="padding:40px 24px;font-family:Arial,Helvetica,sans-serif;">
                    <div style="font-size:13px;letter-spacing:5px;text-transform:uppercase;color:${text};font-weight:600;margin-bottom:16px;">Private Access</div>
                    <p style="font-size:14px;line-height:1.7;color:${muted};margin:0 0 24px 0;">Your signature identifier has been authenticated. As a preliminary welcome to our collective, use allocation code <strong style="color:${text};letter-spacing:2px;">${allocationCode}</strong> during your digital session.</p>
                    <a href="${siteUrl}" target="_blank" style="display:inline-block;border:1px solid ${text};color:${text};text-decoration:none;padding:15px 40px;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Enter Exhibition</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:0 0 40px 0;font-family:Arial,Helvetica,sans-serif;">
              <div style="height:1px;width:40px;background-color:${border};margin:0 auto 20px auto;line-height:1px;font-size:0;">&nbsp;</div>
              <a href="${instagramUrl}" target="_blank" style="color:${text};text-decoration:none;font-size:12px;letter-spacing:1px;font-weight:500;display:block;margin-bottom:14px;">@OSSAI.CO.UK</a>
              <div style="font-size:11px;letter-spacing:2px;color:${muted};">LONDON &bull; EST. 2026</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
