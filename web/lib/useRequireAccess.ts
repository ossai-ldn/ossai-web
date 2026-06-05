import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { isSiteAccessGranted } from './accessSession';

export function useRequireAccess() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!isSiteAccessGranted()) {
      router.replace('/');
      return;
    }
    setAllowed(true);
  }, [router]);

  return allowed;
}
