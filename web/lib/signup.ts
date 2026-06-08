import { registerSignup } from './callables';

export type SignupResult = {
  signupId: string;
  discountCode: string;
  discountPercent: number;
  existing: boolean;
};

export async function submitSignup(params: {
  contact: string;
  source?: string;
  userAgent?: string;
}): Promise<SignupResult> {
  const result = await registerSignup({
    contact: params.contact.trim(),
    source: params.source ?? 'web-landing',
    userAgent: params.userAgent ?? '',
  });
  return {
    signupId: result.signupId,
    discountCode: result.discountCode,
    discountPercent: result.discountPercent,
    existing: result.existing,
  };
}

export function signupErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code: string }).code);
    if (code === 'functions/not-found' || code === 'functions/unavailable') {
      return 'Signup is temporarily unavailable. Please try again shortly.';
    }
    if (code === 'functions/invalid-argument') {
      return 'Enter a valid email or UK mobile (07… or +44…).';
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Could not sign up. Check your connection and try again.';
}
