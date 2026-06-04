import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import twilio from 'twilio';
import { adminApi, getMyDiscount, getSiteStatus, verifySitePassword } from './callables';
import { DEFAULT_DISCOUNT_PERCENT, generateDiscountCode } from './discount';
import { getAccessConfig } from './siteConfig';
import { renderWelcomeEmail } from './welcomeEmail';

initializeApp();

export { verifySitePassword, getSiteStatus, getMyDiscount, adminApi };

const TWILIO_ACCOUNT_SID = defineSecret('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = defineSecret('TWILIO_AUTH_TOKEN');

const SMS_SENDER = defineString('SMS_SENDER', { default: 'OSSAI' });
const EMAIL_FROM = defineString('EMAIL_FROM', { default: 'ossai@ossai.co.uk' });
const SITE_URL = defineString('SITE_URL', { default: 'https://ossai.co.uk' });
const EMAIL_SUBJECT = defineString('EMAIL_SUBJECT', {
  default: 'Ossai — Your private discount',
});

interface SignupDoc {
  contact: string;
  type: 'email' | 'phone';
}

async function assignUniqueDiscount(signupId: string): Promise<{
  discountCode: string;
  discountPercent: number;
}> {
  const db = getFirestore();
  const config = await getAccessConfig();
  const discountPercent = config.defaultDiscountPercent ?? DEFAULT_DISCOUNT_PERCENT;

  for (let attempt = 0; attempt < 8; attempt++) {
    const discountCode = generateDiscountCode();
    const existing = await db
      .collection('signups')
      .where('discountCode', '==', discountCode)
      .limit(1)
      .get();
    if (!existing.empty) continue;

    await db.collection('signups').doc(signupId).update({
      discountCode,
      discountPercent,
    });
    return { discountCode, discountPercent };
  }
  throw new Error('Failed to generate unique discount code');
}

export const sendWelcome = onDocumentCreated(
  {
    document: 'signups/{id}',
    region: 'europe-west2',
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN],
  },
  async (event) => {
    const signupId = event.params.id;
    const data = event.data?.data() as SignupDoc | undefined;
    if (!data || !data.contact || !data.type) {
      logger.warn('Skipping signup with missing data', { id: signupId });
      return;
    }

    const { discountCode, discountPercent } = await assignUniqueDiscount(signupId);
    const siteUrl = SITE_URL.value();

    if (data.type === 'email') {
      await getFirestore()
        .collection('mail')
        .add({
          to: data.contact,
          from: EMAIL_FROM.value(),
          message: {
            subject: EMAIL_SUBJECT.value(),
            html: renderWelcomeEmail({ siteUrl, discountCode, discountPercent }),
          },
        });
      logger.info('Queued welcome email', { id: signupId, discountCode });
      return;
    }

    if (data.type === 'phone') {
      try {
        const client = twilio(TWILIO_ACCOUNT_SID.value(), TWILIO_AUTH_TOKEN.value());
        const sender = SMS_SENDER.value();
        const senderOpts = sender.startsWith('MG')
          ? { messagingServiceSid: sender }
          : { from: sender };

        await client.messages.create({
          to: data.contact,
          body: `Welcome to Ossai. Your code: ${discountCode} (${discountPercent}% off). Visit ${siteUrl}`,
          ...senderOpts,
        });
        logger.info('Sent welcome SMS', { id: signupId });
      } catch (err) {
        logger.error('SMS failed (discount still saved)', { id: signupId, err });
      }
      return;
    }

    logger.warn('Unknown signup type', { id: signupId, type: data.type });
  },
);
