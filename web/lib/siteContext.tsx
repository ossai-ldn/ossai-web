import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCachedShopLive, setCachedShopLive } from './accessSession';
import { fetchPublicSiteConfig } from './callables';
import type { PublicSiteConfig } from './siteTypes';

type Drawer = 'bag' | 'subscribe' | 'menu' | null;

type SiteContextValue = {
  config: PublicSiteConfig;
  shopLive: boolean;
  activeDrawer: Drawer;
  openDrawer: (drawer: Exclude<Drawer, null>) => void;
  closeDrawer: () => void;
  refreshConfig: () => Promise<void>;
};

const DEFAULT_CONFIG: PublicSiteConfig = {
  shopLive: false,
  announcementBar: { enabled: false, messages: [] },
  shippingPromoText: '',
  newsletterPromoText: 'Sign up for early access and 15% off your first order.',
  featuredCollectionHandle: '',
};

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<PublicSiteConfig>({
    ...DEFAULT_CONFIG,
    shopLive: getCachedShopLive(),
  });
  const [activeDrawer, setActiveDrawer] = useState<Drawer>(null);

  const refreshConfig = useCallback(async () => {
    try {
      const data = await fetchPublicSiteConfig();
      setConfig(data);
      setCachedShopLive(data.shopLive);
    } catch {
      /* keep cached */
    }
  }, []);

  useEffect(() => {
    refreshConfig().catch(() => undefined);
  }, [refreshConfig]);

  const openDrawer = useCallback((drawer: Exclude<Drawer, null>) => {
    setActiveDrawer(drawer);
  }, []);

  const closeDrawer = useCallback(() => setActiveDrawer(null), []);

  const value = useMemo(
    () => ({
      config,
      shopLive: config.shopLive,
      activeDrawer,
      openDrawer,
      closeDrawer,
      refreshConfig,
    }),
    [config, activeDrawer, openDrawer, closeDrawer, refreshConfig],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within SiteProvider');
  return ctx;
}
