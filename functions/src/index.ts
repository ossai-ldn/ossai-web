import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import twilio from 'twilio';
import {
  adminApi,
  getMyDiscount,
  getSiteStatus,
  registerSignup,
  verifySitePassword,
} from './callables';
import { ensureSignupDiscount } from './signupDiscount';
import { renderWelcomeEmail } from './welcomeEmail';

initializeApp();

export { verifySitePassword, getSiteStatus, getMyDiscount, registerSignup, adminApi };

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

    const db = getFirestore();
    const snap = await db.collection('signups').doc(signupId).get();
    const existing = snap.data();
    if (existing?.welcomeSent === true) {
      logger.info('Welcome already sent', { id: signupId });
      return;
    }

    const { discountCode, discountPercent } = await ensureSignupDiscount(signupId);
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
      await db.collection('signups').doc(signupId).update({ welcomeSent: true });
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
        await db.collection('signups').doc(signupId).update({ welcomeSent: true });
        logger.info('Sent welcome SMS', { id: signupId });
      } catch (err) {
        logger.error('SMS failed (discount still saved)', { id: signupId, err });
      }
      return;
    }

    logger.warn('Unknown signup type', { id: signupId, type: data.type });
  },
);
