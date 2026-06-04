# Firebase signup integration — setup

The landing page captures a single field that may be an **email** or a **phone
number**, stores it in Firestore, and (once the steps below are done) sends a
branded **welcome email** to emails and a **welcome SMS** to phone numbers.

```
Browser (ossai.co.uk)  --addDoc("signups")-->  Firestore
                                                   |  onCreate
                                                   v
                                          Cloud Function `sendWelcome`
                                       /                         \
                          email: write to `mail`            phone: Twilio SMS
                       (Trigger Email extension → SendGrid)
```

The web client (`web/`) is already wired up. The items below run against the
Firebase project `ossai-9c5e2` and must be done with the Firebase CLI / console
(the client cannot do them).

## 0. Prerequisites

```bash
npm install -g firebase-tools
firebase login
```

## 1. Publish Firestore security rules

The rules allow the public to **create** (well-formed) `signups` docs only —
no reads/updates/deletes, and the `mail` queue is server-only.

```bash
# from the repo root
firebase deploy --only firestore:rules
```

(Or paste `firestore.rules` into Firebase console → Firestore → Rules → Publish.)

> Until these rules are published, the live form will fail with
> `permission-denied`.

## 2. Install the "Trigger Email from Firestore" extension (email channel)

Firebase console → Extensions → install **Trigger Email from Firestore**:

- **Email documents collection:** `mail`
- **SMTP connection URI:** your SendGrid SMTP, e.g.
  `smtps://apikey:<SENDGRID_API_KEY>@smtp.sendgrid.net:465`
- **Default FROM address:** `ossai@ossai.co.uk` (must be on the
  domain you authenticated in SendGrid)

The `ossai.co.uk` domain DNS (SPF/DKIM CNAMEs + DMARC) is already verified.

## 3. Configure the Cloud Function secrets & params (SMS channel + config)

```bash
# Secrets (Twilio) — use the ROTATED auth token, never commit these
firebase functions:secrets:set TWILIO_ACCOUNT_SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN
```

Non-secret params have sensible defaults (see `functions/src/index.ts`) and can
be overridden with environment variables at deploy time if needed:

| Param          | Default                   | Notes |
|----------------|---------------------------|-------|
| `SMS_SENDER`   | `OSSAI`                   | Alphanumeric sender ID, a purchased number, or a Messaging Service SID (`MG…`). |
| `EMAIL_FROM`   | `ossai@ossai.co.uk`       | Must match the Trigger Email extension's authenticated sender. |
| `SITE_URL`     | `https://ossai.co.uk`     | Linked in the email button and SMS body. |
| `EMAIL_SUBJECT`| `Ossai — Private Access`  | Welcome email subject. |

### Twilio sender

Create an **Alphanumeric Sender ID** `OSSAI` (recommended for UK; one-way) or a
purchased UK number in the Twilio console, then make sure `SMS_SENDER` matches.

## 4. Deploy the Cloud Function

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## 5. (Optional) Automate function/rules deploy in CI

Add a `FIREBASE_SERVICE_ACCOUNT` secret and a workflow step using
`w9jds/firebase-action` or `google-github-actions/auth` + `firebase deploy`.
Not set up yet — functions/rules are deployed manually for now.

## Notes

- The Firebase **web config** in `web/lib/firebase.ts` is public (client
  identifiers), secured by the rules above — safe to ship in the static bundle.
  Override via `EXPO_PUBLIC_FIREBASE_*` env vars if desired.
- A captcha (e.g., Cloudflare Turnstile) is intentionally deferred; until then
  the `signups` collection is publicly writable (create-only, shape-validated),
  so bot spam is possible.
