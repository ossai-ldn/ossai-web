import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { classifyContact } from './classifyContact';
import { fetchMyDiscount, registerSignup } from './callables';
import { db } from './firebase';

export type SignupResult = {
  signupId: string;
  discountCode: string;
  discountPercent: number;
  existing: boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function callableCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    return String((err as { code: string }).code);
  }
  return '';
}

/** registerSignup returns 404 HTML when not deployed — SDK reports functions/internal. */
function isRegisterSignupUnavailable(err: unknown): boolean {
  const code = callableCode(err);
  return (
    code === 'functions/not-found' ||
    code === 'functions/unavailable' ||
    code === 'functions/internal' ||
    code === 'functions/deadline-exceeded'
  );
}

async function waitForDiscount(signupId: string): Promise<SignupResult | null> {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const d = await fetchMyDiscount({ signupId });
      if (d.discountCode) {
        return {
          signupId,
          discountCode: d.discountCode,
          discountPercent: d.discountPercent,
          existing: false,
        };
      }
    } catch {
      /* sendWelcome may still be running */
    }
    await sleep(800);
  }
  return null;
}

/** Used when registerSignup is not deployed yet. Dedupes via getMyDiscount when possible. */
async function fallbackFirestoreSignup(
  raw: string,
  meta: { source: string; userAgent: string },
): Promise<SignupResult> {
  const contact = classifyContact(raw);
  if (!contact) {
    throw new Error('Enter a valid email or UK mobile (07… or +44…).');
  }

  try {
    const existing = await fetchMyDiscount({ contact: contact.value });
    if (existing.signupId) {
      return {
        signupId: existing.signupId,
        discountCode: existing.discountCode,
        discountPercent: existing.discountPercent,
        existing: true,
      };
    }
  } catch (err) {
    if (callableCode(err) !== 'functions/not-found') {
      throw err;
    }
  }

  const ref = await addDoc(collection(db, 'signups'), {
    contact: contact.value,
    type: contact.type,
    source: meta.source,
    userAgent: meta.userAgent,
    createdAt: serverTimestamp(),
  });

  const withDiscount = await waitForDiscount(ref.id);
  if (withDiscount) return withDiscount;

  return {
    signupId: ref.id,
    discountCode: '',
    discountPercent: 10,
    existing: false,
  };
}

export async function submitSignup(params: {
  contact: string;
  source?: string;
  userAgent?: string;
}): Promise<SignupResult> {
  const meta = {
    source: params.source ?? 'web-landing',
    userAgent: params.userAgent ?? '',
  };

  try {
    const result = await registerSignup({
      contact: params.contact.trim(),
      source: meta.source,
      userAgent: meta.userAgent,
    });
    return {
      signupId: result.signupId,
      discountCode: result.discountCode,
      discountPercent: result.discountPercent,
      existing: result.existing,
    };
  } catch (err) {
    if (!isRegisterSignupUnavailable(err)) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Signup failed. Please try again.';
      throw new Error(message);
    }
    console.warn('registerSignup unavailable, using Firestore fallback', callableCode(err));
    return fallbackFirestoreSignup(params.contact.trim(), meta);
  }
}

export function signupErrorMessage(err: unknown): string {
  const code = callableCode(err);
  if (code === 'functions/permission-denied') {
    return 'Signup is not available right now. Please try again in a few minutes.';
  }
  if (code === 'functions/internal' || code === 'functions/unavailable') {
    return 'Signup service is temporarily unavailable. Please try again.';
  }
  if (code === 'functions/invalid-argument') {
    return 'Enter a valid email or UK mobile (07… or +44…).';
  }
  if (err instanceof Error && err.message && err.message !== 'internal') {
    return err.message;
  }
  return 'Could not sign up. Check your connection and try again.';
}
