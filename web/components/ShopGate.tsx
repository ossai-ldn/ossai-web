import { Redirect } from 'expo-router';
import { isSiteAccessGranted } from '../lib/accessSession';

type Props = {
  children: React.ReactNode;
};

/**
 * Blocks shop/search routes unless the visitor has unlocked with the site password.
 * Redirect is synchronous (render-time), not deferred to useEffect.
 */
export default function ShopGate({ children }: Props) {
  if (!isSiteAccessGranted()) {
    return <Redirect href="/" />;
  }
  return <>{children}</>;
}
