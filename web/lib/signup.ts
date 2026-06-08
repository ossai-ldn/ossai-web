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

function isCallableUnavailable(err: unknown): boolean {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code: string }).code)
      : '';
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

/** Direct Firestore signup when registerSignup callable is not deployed yet. */
async function fallbackFirestoreSignup(
  raw: string,
  meta: { source: string; userAgent: string },
): Promise<SignupResult> {
  const contact = classifyContact(raw);
  if (!contact) {
    throw new Error('Invalid email or phone number.');
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
      contact: params.contact,
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
    if (!isCallableUnavailable(err)) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Signup failed. Please try again.';
      throw new Error(message);
    }
    console.warn('registerSignup unavailable, using Firestore fallback', err);
    return fallbackFirestoreSignup(params.contact, meta);
  }
}

export function signupErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Could not sign up. Check your connection and try again.';
}
