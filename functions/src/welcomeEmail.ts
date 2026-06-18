export interface WelcomeEmailOptions {
  siteUrl: string;
  /** Magic link that links this email to the browser for shop/discount access. */
  welcomeLink?: string;
  discountCode: string;
  discountPercent: number;
  instagramUrl?: string;
  /** Shown in footer for CAN-SPAM / Apple Mail compliance. */
  companyAddress?: string;
  contactEmail?: string;
  unsubscribeEmail?: string;
}

const DEFAULT_ADDRESS = 'London, United Kingdom';
const DEFAULT_CONTACT = 'ossai@ossai.co.uk';

const BRIQUE_FALLBACK = "Georgia, 'Times New Roman', serif";

function briqueFontUrl(siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, '');
  return `${base}/fonts/Brique-Regular.otf`;
}

function briqueEmailStyles(siteUrl: string): string {
  const fontUrl = briqueFontUrl(siteUrl);
  return `
  <style type="text/css">
    @font-face {
      font-family: 'Brique';
      font-style: normal;
      font-weight: normal;
      src: url('${fontUrl}') format('opentype');
    }
    .ossai-brand {
      font-family: 'Brique', ${BRIQUE_FALLBACK};
      font-size: 34px;
      letter-spacing: 8px;
      text-transform: uppercase;
      color: #ffffff;
      line-height: 1;
      mso-line-height-rule: exactly;
    }
  </style>`;
}

function brandWordmarkStyle(): string {
  return `font-family:'Brique',${BRIQUE_FALLBACK};font-size:34px;letter-spacing:8px;text-transform:uppercase;line-height:1;mso-line-height-rule:exactly;`;
}

/**
 * Plain-text welcome email (multipart alternative improves inbox placement).
 */
export function renderWelcomeEmailText(options: WelcomeEmailOptions): string {
  const {
    siteUrl,
    welcomeLink,
    discountCode,
    discountPercent,
    instagramUrl = 'https://instagram.com',
    companyAddress = DEFAULT_ADDRESS,
    contactEmail = DEFAULT_CONTACT,
    unsubscribeEmail = DEFAULT_CONTACT,
  } = options;

  const accessLine = welcomeLink
    ? `Open your private link (links this device to your discount):\n${welcomeLink}\n`
    : '';

  return `OSSAI

Thank you for joining the Ossai collective.

Your private discount has been reserved for our next exhibition.

Your code: ${discountCode}
${discountPercent}% off at checkout when the shop is live.

${accessLine}When the exhibition opens, visit ${siteUrl} and enter the drop password to view the collection.

Visit the site: ${siteUrl}
Instagram: ${instagramUrl}

---
You received this email because you signed up at ${siteUrl}.
Ossai — ${companyAddress}
Questions: ${contactEmail}
To stop marketing emails, reply to this message or email ${unsubscribeEmail}?subject=Unsubscribe
`;
}

/**
 * Renders the Ossai welcome email as email-safe HTML.
 *
 * Designed for deliverability: text-heavy layout, no spam triggers (no red
 * text, no ALL CAPS subject patterns in body), physical address + unsubscribe.
 */
export function renderWelcomeEmail(options: WelcomeEmailOptions): string {
  const {
    siteUrl,
    welcomeLink = siteUrl,
    discountCode,
    discountPercent,
    instagramUrl = 'https://instagram.com',
    companyAddress = DEFAULT_ADDRESS,
    contactEmail = DEFAULT_CONTACT,
    unsubscribeEmail = DEFAULT_CONTACT,
  } = options;

  const bg = '#111112';
  const card = '#1c1c1e';
  const text = '#ffffff';
  const muted = '#8e8e93';
  const border = '#2c2c2e';
  const unsubscribeHref = `mailto:${unsubscribeEmail}?subject=Unsubscribe`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>OSSAI — Welcome</title>
  ${briqueEmailStyles(siteUrl)}
</head>
<body style="margin:0;padding:0;background-color:${bg};color:${text};-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${bg};">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" width="440" cellpadding="0" cellspacing="0" border="0" style="width:440px;max-width:100%;">

          <tr>
            <td align="center" style="padding:40px 0 28px 0;border-bottom:1px solid ${border};">
              <div class="ossai-brand" style="${brandWordmarkStyle()}color:${text};">OSSAI</div>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 16px 24px 16px;font-family:Arial,Helvetica,sans-serif;">
              <p style="font-size:15px;line-height:1.7;color:${text};margin:0 0 16px 0;">Thank you for joining the Ossai collective.</p>
              <p style="font-size:14px;line-height:1.7;color:${muted};margin:0 0 16px 0;">Ossai is a deliberate study in contemporary form, quiet utility, and enduring structure. We release in limited quantities for each exhibition.</p>
              <p style="font-size:14px;line-height:1.7;color:${muted};margin:0;">Your private discount has been reserved for our next drop. When the exhibition opens, you will use the code below at checkout.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 0 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${border};background-color:${card};">
                <tr>
                  <td style="padding:32px 24px;font-family:Arial,Helvetica,sans-serif;">
                    <p style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${muted};margin:0 0 12px 0;">Your discount code</p>
                    <p style="font-size:22px;letter-spacing:3px;color:${text};margin:0 0 8px 0;font-weight:600;">${discountCode}</p>
                    <p style="font-size:14px;line-height:1.6;color:${muted};margin:0 0 20px 0;">${discountPercent}% off at checkout when the shop is live.</p>
                    <p style="font-size:13px;line-height:1.6;color:${muted};margin:0 0 16px 0;">Tap below to link this email to your browser and load your discount at the shop.</p>
                    <a href="${welcomeLink}" target="_blank" style="display:inline-block;border:1px solid ${text};color:${text};text-decoration:none;padding:12px 28px;font-size:12px;letter-spacing:2px;margin-bottom:16px;">Open your private access</a>
                    <p style="font-size:12px;line-height:1.6;color:${muted};margin:0;">Then visit <a href="${siteUrl}" style="color:${text};">${siteUrl}</a> and enter the drop password to view the collection.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:0 0 24px 0;font-family:Arial,Helvetica,sans-serif;">
              <a href="${instagramUrl}" target="_blank" style="color:${muted};text-decoration:none;font-size:12px;letter-spacing:1px;">Follow @ossai.co.uk</a>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 16px 40px 16px;border-top:1px solid ${border};font-family:Arial,Helvetica,sans-serif;">
              <p style="font-size:11px;line-height:1.6;color:${muted};margin:0 0 8px 0;text-align:center;">You received this email because you signed up at ${siteUrl}.</p>
              <p style="font-size:11px;line-height:1.6;color:${muted};margin:0 0 8px 0;text-align:center;">Ossai — ${companyAddress}</p>
              <p style="font-size:11px;line-height:1.6;color:${muted};margin:0 0 8px 0;text-align:center;">Contact: <a href="mailto:${contactEmail}" style="color:${muted};">${contactEmail}</a></p>
              <p style="font-size:11px;line-height:1.6;color:${muted};margin:0;text-align:center;"><a href="${unsubscribeHref}" style="color:${muted};text-decoration:underline;">Unsubscribe</a> from future marketing emails.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
