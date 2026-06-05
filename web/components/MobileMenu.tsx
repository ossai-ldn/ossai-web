import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { isSiteAccessGranted } from '../lib/accessSession';
import { useSite } from '../lib/siteContext';
import { colors } from '../lib/theme';
import DrawerPanel from './DrawerPanel';
import PasswordGateControls from './PasswordGateControls';

const NAV_LINKS = [
  { href: '/shop', label: 'SHOP', gated: true },
  { href: '/about', label: 'ABOUT', gated: false },
  { href: '/help', label: 'HELP', gated: false },
  { href: '/archives', label: 'ARCHIVES', gated: false },
  { href: '/press', label: 'PRESS', gated: false },
] as const;

export default function MobileMenu() {
  const { activeDrawer, closeDrawer, openDrawer } = useSite();
  const visible = activeDrawer === 'menu';
  const hasAccess = isSiteAccessGranted();

  return (
    <DrawerPanel visible={visible} onClose={closeDrawer} title="MENU" side="full">
      <ScrollView showsVerticalScrollIndicator={false}>
        {NAV_LINKS.map((link) => {
          if (link.gated && !hasAccess) return null;
          return (
            <Link key={link.href} href={link.href as never} asChild>
              <TouchableOpacity style={styles.navItem} onPress={closeDrawer} activeOpacity={0.7}>
                <Text style={styles.navText}>{link.label}</Text>
              </TouchableOpacity>
            </Link>
          );
        })}

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            closeDrawer();
            openDrawer('subscribe');
          }}
        >
          <Text style={styles.navText}>NEWSLETTER</Text>
        </TouchableOpacity>

        <View style={styles.gateSection}>
          <PasswordGateControls navigateOnUnlock={false} />
        </View>
      </ScrollView>
    </DrawerPanel>
  );
}

const styles = StyleSheet.create({
  navItem: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navText: {
    color: colors.text,
    fontSize: 14,
    letterSpacing: 4,
  },
  gateSection: {
    marginTop: 32,
    alignItems: 'flex-start',
  },
});
