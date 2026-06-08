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
Firebase project `ossai-82889` and must be done with the Firebase CLI / console
(the client cannot do them).

## 0. Prerequisites

```bash
npm install -g firebase-tools
firebase login
```

> **Region:** this project standardizes on **London — `europe-west2`**. The
> Firestore database, the Trigger Email extension, and the `sendWelcome`
> function must all use `europe-west2` (a Firestore event trigger must be in the
> same region as its database). If the database was created in another location
> (e.g. the `eur3` multi-region), delete it while empty and recreate it in
> `europe-west2`: Firebase console → Firestore → create database → location
> **europe-west2 (London)**. A Firestore location is permanent once chosen.

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

- **Cloud Functions location:** `europe-west2` (London) — must match the
  Firestore database location, otherwise install fails with
  `Database '(default)' does not exist in region …`.
- **Email documents collection:** `mail`
- **SMTP connection URI:** your SendGrid SMTP, e.g.
  `smtps://apikey:<SENDGRID_API_KEY>@smtp.sendgrid.net:465`
- **Default FROM address:** `ossai@ossai.co.uk` (must match **Domain Authentication** in SendGrid)
- **SMTP URI format:** `smtps://apikey@smtp.sendgrid.net:465` with the API key in the **password** field (not embedded in the URI)

### 2a. SendGrid domain authentication (critical for Apple Mail / iCloud)

Without SPF + DKIM + DMARC, messages may send but land in **Junk** — especially in Apple Mail. Apple flags mail that claims to be from `ossai.co.uk` but is signed only as `sendgrid.net`.

**In Twilio SendGrid → Settings → Sender Authentication → Authenticate Your Domain:**

1. Enter **`ossai.co.uk`** (not a subdomain unless you use one for mail only).
2. Add the DNS records SendGrid provides at your domain host (GoDaddy, Cloudflare, etc.):

| Record | Purpose |
|--------|---------|
| **CNAME** (×2) | **DKIM** — cryptographic signature proving the message was not altered |
| **TXT** or include in SPF | **SPF** — lists SendGrid as an allowed sender for your domain |
| **TXT** `_dmarc.ossai.co.uk` | **DMARC** — tells receivers what to do if SPF/DKIM fail |

**Minimum DMARC** (monitoring only, still helps reputation):

```
v=DMARC1; p=none; rua=mailto:ossai@ossai.co.uk
```

After DNS propagates (up to 48h), click **Verify** in SendGrid. Status must show **Verified** before expecting reliable inbox placement.

**FROM address must match:** `ossai@ossai.co.uk` (or another address on the authenticated domain). Do not use `@gmail.com` or an unverified subdomain.

### 2b. Branded link tracking (optional but recommended)

Default SendGrid click tracking wraps links as `ct.sendgrid.net`, which spam filters (including Apple/Proofpoint) often distrust.

**SendGrid → Settings → Sender Authentication → Link Branding:**

- Create a subdomain such as **`links.ossai.co.uk`**
- Add the CNAME SendGrid provides
- Enable link branding so tracked links use your domain

Until this is set up, consider **disabling click tracking** on transactional mail in SendGrid if junk placement persists.

### 2c. Shared IP vs dedicated IP

On free/lower SendGrid tiers, mail sends from **shared IPs**. If another sender on that IP spams, your mail can be affected temporarily.

- **Budget fix:** Strong authentication (above) + plain-text multipart + compliant footer (address, unsubscribe) — already in the welcome template.
- **Pro fix:** SendGrid plan with a **Dedicated IP** isolates your reputation.

### 2d. Welcome email content (already in code)

The `sendWelcome` function sends **HTML + plain text**, a neutral subject (`Welcome to Ossai`), physical address footer, and unsubscribe link — all of which Apple and CAN-SPAM checks look for. Avoid changing the subject to shouty patterns (`FREE`, `URGENT`, `$$$`).

## 3. Configure the Cloud Function secrets & params (SMS channel + config)

```bash
# Secrets (Twilio) — use the ROTATED auth token, never commit these
firebase functions:secrets:set TWILIO_ACCOUNT_SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN
```

Non-secret params have sensible defaults (see `functions/src/index.ts`) and can
be overridden in `functions/.env.ossai-82889` (copy from `.env.ossai-82889.example`).

**Do not** put `ADMIN_SECRET`, `TWILIO_ACCOUNT_SID`, or `TWILIO_AUTH_TOKEN` in the
`.env` file — those are Firebase **secrets** only (`firebase functions:secrets:set`).
Putting them in `.env` causes deploy errors: *Secret environment variable overlaps
non secret environment variable*.

| Param          | Default                   | Notes |
|----------------|---------------------------|-------|
| `SMS_SENDER`   | `OSSAI`                   | Alphanumeric sender ID, a purchased number, or a Messaging Service SID (`MG…`). |
| `EMAIL_FROM`   | `ossai@ossai.co.uk`       | Must match the Trigger Email extension's authenticated sender. |
| `SITE_URL`     | `https://ossai.co.uk`     | Linked in the email button and SMS body. |
| `EMAIL_SUBJECT`| `Welcome to Ossai` | Keep neutral — avoid spam-trigger words. |
| `EMAIL_REPLY_TO` | `ossai@ossai.co.uk` | Reply-To header on welcome mail. |
| `EMAIL_COMPANY_ADDRESS` | `London, United Kingdom` | Footer address (update to registered business address). |

### Twilio sender

Create an **Alphanumeric Sender ID** `OSSAI` (recommended for UK; one-way) or a
purchased UK number in the Twilio console, then make sure `SMS_SENDER` matches.

## 4. Deploy Cloud Functions, rules, and indexes

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

**Required functions:** `registerSignup`, `verifyWelcomeLink`, `sendWelcome`, `getMyDiscount`, `verifySitePassword`, `getSiteStatus`, `adminApi`.

If signup shows **Retry / internal**, `registerSignup` is usually **not deployed** (the site falls back to Firestore + `getMyDiscount` dedupe until you run `firebase deploy --only functions`). Deploy **both** `functions` and `firestore:rules` together.

If admin shows **Unknown action: backfillSignups** (or similar), the live `adminApi` function is an **older build**. The admin UI will run a **partial** client-side backfill (assign missing discount codes) automatically, but duplicate removal and canonical-id migration still require a functions deploy.

### Google Cloud Shell

`main` does **not** include `functions/` or root `package.json`. Check out the Firebase branch first:

```bash
cd ~/ossai-web
git fetch origin
git checkout cursor/add-firebase-signup-storage-e9f5
```

Then deploy (either form works):

```bash
npm run deploy:firebase
```

```bash
cd functions && npm ci && npm run build && cd ..
firebase deploy --only firestore:rules,firestore:indexes,storage,functions --project ossai-82889
```

Or use GitHub Actions → **Deploy Firebase (functions + rules)** (requires `FIREBASE_SERVICE_ACCOUNT` secret).

New callables: `registerSignup`, `verifySitePassword`, `getSiteStatus`, `getMyDiscount`, `adminApi`.

Signups are created **only** via **`registerSignup`** (one doc per normalized email/phone, deterministic id). Direct Firestore `signups` writes are blocked. Welcome emails include a magic link (`/welcome?sid=…&t=…`) that links the browser to the signup for shop discount access. In `/admin`, run **DEDUPE & BACKFILL DISCOUNTS** once to merge legacy duplicates and migrate to canonical ids.

Set the **admin secret** (for `/admin` on the site):

```bash
firebase functions:secrets:set ADMIN_SECRET
# choose a long random string; enter it on https://ossai.co.uk/admin
```

### Product media upload (admin)

Enable **Firebase Storage** in the console (usually auto-enabled on first storage deploy).

In `/admin` → edit a product → **UPLOAD IMAGE FROM DEVICE** or **UPLOAD VIDEO FROM DEVICE**
uploads to `products/` in Storage via signed URLs from `adminApi` (`getProductUploadUrl`).

Deploy **storage rules + adminApi** after pulling this branch:

```bash
npm run deploy:firebase
```

If `adminApi` fails with an `ADMIN_SECRET` overlap error, remove secret keys from
`functions/.env.ossai-82889`, then delete and redeploy adminApi:

```bash
firebase functions:delete adminApi --region europe-west2 --project ossai-82889
firebase deploy --only functions:adminApi,storage --project ossai-82889
```

`sendWelcome` now assigns a **unique discount code** (default **10% off**) per signup and includes it in the welcome email.

## 5. (Optional) Automate function/rules deploy in CI

Add a `FIREBASE_SERVICE_ACCOUNT` secret and a workflow step using
`w9jds/firebase-action` or `google-github-actions/auth` + `firebase deploy`.
Not set up yet — functions/rules are deployed manually for now.

## Phase 1 site features

| URL | Purpose |
|-----|---------|
| `/` | Newsletter signup |
| `/shop` | Gated shop grid (hover front/back images, links to product pages) |
| `/shop/[slug]` | Product detail page (editable in admin) |
| `/admin` | Admin panel — products, stock, show/hide, signups backfill |

Default site password until you change it in admin: **`OSSAI10`**.

## Notes

- The Firebase **web config** in `web/lib/firebase.ts` is public (client
  identifiers), secured by the rules above — safe to ship in the static bundle.
  Override via `EXPO_PUBLIC_FIREBASE_*` env vars if desired.
- A captcha (e.g., Cloudflare Turnstile) is intentionally deferred; signups are
  created only through the `registerSignup` callable (Firestore `signups` create is denied).
