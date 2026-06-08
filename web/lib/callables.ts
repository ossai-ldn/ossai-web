import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

const functions = getFunctions(app, 'europe-west2');

export async function verifySitePassword(password: string) {
  const fn = httpsCallable<{ password: string }, { ok: boolean; shopLive: boolean }>(
    functions,
    'verifySitePassword',
  );
  const result = await fn({ password });
  return result.data;
}

export async function fetchSiteStatus() {
  const fn = httpsCallable<unknown, { shopLive: boolean }>(functions, 'getSiteStatus');
  const result = await fn({});
  return result.data;
}

export async function registerSignup(params: {
  contact: string;
  source?: string;
  userAgent?: string;
}) {
  const fn = httpsCallable<
    { contact: string; source?: string; userAgent?: string },
    {
      signupId: string;
      existing: boolean;
      discountCode: string;
      discountPercent: number;
      contact: string;
    }
  >(functions, 'registerSignup');
  const result = await fn(params);
  return result.data;
}

export async function verifyWelcomeLink(params: { signupId: string; token: string }) {
  const fn = httpsCallable<
    { signupId: string; token: string },
    { signupId: string; discountCode: string; discountPercent: number; contact: string }
  >(functions, 'verifyWelcomeLink');
  const result = await fn(params);
  return result.data;
}

export async function fetchMyDiscount(params: { signupId?: string; contact?: string }) {
  const fn = httpsCallable<
    { signupId?: string; contact?: string },
    { discountCode: string; discountPercent: number; contact: string; signupId?: string }
  >(functions, 'getMyDiscount');
  const result = await fn(params);
  return result.data;
}

export async function adminRequest<T>(
  adminSecret: string,
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const fn = httpsCallable<{ adminSecret: string; action: string }, T>(functions, 'adminApi');
  const result = await fn({ adminSecret, action, ...payload });
  return result.data as T;
}
