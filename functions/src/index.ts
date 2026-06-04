import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import twilio from 'twilio';
import { renderWelcomeEmail } from './welcomeEmail';

initializeApp();

// Secrets (set with `firebase functions:secrets:set TWILIO_ACCOUNT_SID` etc.).
const TWILIO_ACCOUNT_SID = defineSecret('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = defineSecret('TWILIO_AUTH_TOKEN');

// Non-secret config (override per-environment if needed).
const SMS_SENDER = defineString('SMS_SENDER', { default: 'OSSAI' });
const EMAIL_FROM = defineString('EMAIL_FROM', { default: 'welcome@ossai.co.uk' });
const SITE_URL = defineString('SITE_URL', { default: 'https://ossai.co.uk' });
const EMAIL_SUBJECT = defineString('EMAIL_SUBJECT', { default: 'Ossai — Private Access' });

interface SignupDoc {
  contact: string;
  type: 'email' | 'phone';
}

/**
 * On every new `signups` document:
 *  - email  -> queue the branded HTML welcome email (consumed by the
 *              "Trigger Email from Firestore" extension via the `mail` collection)
 *  - phone  -> send an SMS with a link to the site via Twilio
 */
export const sendWelcome = onDocumentCreated(
  {
    document: 'signups/{id}',
    region: 'us-central1',
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN],
  },
  async (event) => {
    const data = event.data?.data() as SignupDoc | undefined;
    if (!data || !data.contact || !data.type) {
      logger.warn('Skipping signup with missing data', { id: event.params.id });
      return;
    }

    if (data.type === 'email') {
      await getFirestore()
        .collection('mail')
        .add({
          to: data.contact,
          from: EMAIL_FROM.value(),
          message: {
            subject: EMAIL_SUBJECT.value(),
            html: renderWelcomeEmail({ siteUrl: SITE_URL.value() }),
          },
        });
      logger.info('Queued welcome email', { id: event.params.id });
      return;
    }

    if (data.type === 'phone') {
      const client = twilio(TWILIO_ACCOUNT_SID.value(), TWILIO_AUTH_TOKEN.value());
      const sender = SMS_SENDER.value();
      // A Messaging Service SID starts with "MG"; anything else is treated as a
      // sender (alphanumeric sender ID like "OSSAI", or a purchased number).
      const senderOpts = sender.startsWith('MG')
        ? { messagingServiceSid: sender }
        : { from: sender };

      await client.messages.create({
        to: data.contact,
        body: `Welcome to Ossai. Use allocation code OSSAI10. Enter the exhibition: ${SITE_URL.value()}`,
        ...senderOpts,
      });
      logger.info('Sent welcome SMS', { id: event.params.id });
      return;
    }

    logger.warn('Unknown signup type', { id: event.params.id, type: data.type });
  },
);
