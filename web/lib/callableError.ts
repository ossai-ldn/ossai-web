export function callableCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    return String((err as { code: string }).code);
  }
  return '';
}

export function callableMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    if ('message' in err && typeof (err as { message: unknown }).message === 'string') {
      const message = (err as { message: string }).message.trim();
      if (message) return message;
    }
    if ('details' in err && typeof (err as { details: unknown }).details === 'string') {
      const details = (err as { details: string }).details.trim();
      if (details) return details;
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Action failed';
}

export function isUnknownAdminAction(err: unknown, action?: string): boolean {
  const message = callableMessage(err).toLowerCase();
  if (message.includes('unknown action')) return true;
  if (action && message.includes(`unknown action: ${action.toLowerCase()}`)) return true;
  return callableCode(err) === 'functions/invalid-argument' && message.includes('backfillsignups');
}
