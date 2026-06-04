const ACCESS_KEY = 'ossai_site_access';
const SHOP_LIVE_KEY = 'ossai_shop_live';
const SIGNUP_ID_KEY = 'ossai_signup_id';
const ADMIN_KEY = 'ossai_admin_secret';
const ACCESS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface AccessPayload {
  grantedAt: number;
}

function storage(): Storage | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
}

export function isSiteAccessGranted(): boolean {
  const s = storage();
  if (!s) return false;
  const raw = s.getItem(ACCESS_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as AccessPayload;
    return Date.now() - parsed.grantedAt < ACCESS_TTL_MS;
  } catch {
    return false;
  }
}

export function grantSiteAccess(shopLive: boolean): void {
  const s = storage();
  if (!s) return;
  s.setItem(ACCESS_KEY, JSON.stringify({ grantedAt: Date.now() }));
  s.setItem(SHOP_LIVE_KEY, shopLive ? '1' : '0');
}

export function clearSiteAccess(): void {
  storage()?.removeItem(ACCESS_KEY);
  storage()?.removeItem(SHOP_LIVE_KEY);
}

export function getCachedShopLive(): boolean {
  return storage()?.getItem(SHOP_LIVE_KEY) === '1';
}

export function setCachedShopLive(live: boolean): void {
  storage()?.setItem(SHOP_LIVE_KEY, live ? '1' : '0');
}

export function setStoredSignupId(id: string): void {
  storage()?.setItem(SIGNUP_ID_KEY, id);
}

export function getStoredSignupId(): string | null {
  return storage()?.getItem(SIGNUP_ID_KEY) ?? null;
}

export function setAdminSecret(secret: string): void {
  storage()?.setItem(ADMIN_KEY, secret);
}

export function getAdminSecret(): string | null {
  return storage()?.getItem(ADMIN_KEY) ?? null;
}

export function clearAdminSecret(): void {
  storage()?.removeItem(ADMIN_KEY);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
