import { BlurView } from 'expo-blur';
import { Link, usePathname } from 'expo-router';
import {
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { isSiteAccessGranted } from '../lib/accessSession';
import { useOptionalCart } from '../lib/cartContext';
import { useSite } from '../lib/siteContext';
import { colors } from '../lib/theme';
import AnnouncementBar from './AnnouncementBar';
import OssaiLogo from './OssaiLogo';
import PasswordGateControls from './PasswordGateControls';

const NAV_LINKS = [
  { href: '/shop', label: 'SHOP', gated: true },
  { href: '/about', label: 'ABOUT', gated: false },
  { href: '/help', label: 'HELP', gated: false },
] as const;

const HEADER_BASE = 56;
const ANNOUNCEMENT = 32;

export default function SiteHeader() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isHome = pathname === '/' || pathname === '';
  const { openDrawer } = useSite();
  const cart = useOptionalCart();
  const itemCount = cart?.itemCount ?? 0;
  const hasAccess = isSiteAccessGranted();
  if (isHome) return null;

  return (
    <View style={styles.wrapper}>
      <AnnouncementBar />
      <BlurView intensity={30} tint="dark" style={styles.header}>
        <SafeAreaView>
          <View style={styles.row}>
            {isMobile ? (
              <TouchableOpacity onPress={() => openDrawer('menu')} style={styles.iconBtn}>
                <Text style={styles.iconText}>☰</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.navLeft}>
                {NAV_LINKS.map((link) => {
                  if (link.gated && !hasAccess) return null;
                  const active = pathname.startsWith(link.href);
                  return (
                    <Link key={link.href} href={link.href as never} asChild>
                      <TouchableOpacity activeOpacity={0.7}>
                        <Text style={[styles.navLink, active && styles.navLinkActive]}>
                          {link.label}
                        </Text>
                      </TouchableOpacity>
                    </Link>
                  );
                })}
              </View>
            )}

            <Link href="/" asChild>
              <TouchableOpacity style={styles.logoWrap} activeOpacity={0.8}>
                <OssaiLogo size="sm" preferText />
              </TouchableOpacity>
            </Link>

            <View style={styles.right}>
              {!isMobile && hasAccess && (
                <Link href="/search" asChild>
                  <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
                    <Text style={styles.iconText}>⌕</Text>
                  </TouchableOpacity>
                </Link>
              )}
              {!isMobile && (
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => openDrawer('subscribe')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.iconText}>✉</Text>
                </TouchableOpacity>
              )}
              {hasAccess && (
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => openDrawer('bag')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.iconText}>BAG</Text>
                  {itemCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{itemCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              {!isMobile && !hasAccess && (
                <PasswordGateControls navigateOnUnlock={false} compact />
              )}
            </View>
          </View>
        </SafeAreaView>
      </BlurView>
    </View>
  );
}

export function useHeaderOffset(): number {
  const { config } = useSite();
  const hasAnnouncement =
    config.announcementBar.enabled && config.announcementBar.messages.some((m) => m.text.trim());
  return HEADER_BASE + (hasAnnouncement ? ANNOUNCEMENT : 0) + (Platform.OS === 'web' ? 0 : 20);
}

export const SITE_HEADER_HEIGHT = HEADER_BASE + ANNOUNCEMENT + 24;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  header: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: HEADER_BASE,
  },
  navLeft: {
    flexDirection: 'row',
    gap: 20,
    flex: 1,
  },
  navLink: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 3,
  },
  navLinkActive: {
    color: colors.text,
  },
  logoWrap: {
    paddingHorizontal: 12,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'flex-end',
  },
  iconBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    position: 'relative',
  },
  iconText: {
    color: colors.text,
    fontSize: 11,
    letterSpacing: 2,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.text,
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.bg,
    fontSize: 8,
    fontWeight: '700',
  },
});
