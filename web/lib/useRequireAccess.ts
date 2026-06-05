import { Redirect } from 'expo-router';
import { isSiteAccessGranted } from './accessSession';

/** @deprecated Prefer ShopGate layout or redirectIfNoAccess() */
export function useRequireAccess(): boolean {
  return isSiteAccessGranted();
}

/** Render-time redirect — use at the top of gated screens outside shop/_layout. */
export function redirectIfNoAccess() {
  if (!isSiteAccessGranted()) {
    return <Redirect href="/" />;
  }
  return null;
}
