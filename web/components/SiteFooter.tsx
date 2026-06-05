import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { isSiteAccessGranted } from '../lib/accessSession';
import { colors } from '../lib/theme';

const SHOP_LINKS = [
  { href: '/shop', label: 'Shop All', gated: true },
  { href: '/search', label: 'Search', gated: true },
];

const INFO_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/help', label: 'Help' },
  { href: '/archives', label: 'Archives' },
  { href: '/press', label: 'Press' },
];

const POLICY_LINKS = [
  { href: '/policies/terms', label: 'Terms' },
  { href: '/policies/privacy', label: 'Privacy' },
  { href: '/policies/shipping', label: 'Shipping' },
  { href: '/policies/returns', label: 'Returns' },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string; gated?: boolean }[];
}) {
  const hasAccess = isSiteAccessGranted();
  const visible = links.filter((l) => !l.gated || hasAccess);
  if (visible.length === 0) return null;

  return (
    <View style={styles.column}>
      <Text style={styles.columnTitle}>{title}</Text>
      {visible.map((link) => (
        <Link key={link.href} href={link.href as never} style={styles.link}>
          {link.label}
        </Link>
      ))}
    </View>
  );
}

export default function SiteFooter() {
  return (
    <View style={styles.footer}>
      <View style={styles.columns}>
        <FooterColumn title="SHOP" links={SHOP_LINKS} />
        <FooterColumn title="INFO" links={INFO_LINKS} />
        <FooterColumn title="POLICIES" links={POLICY_LINKS} />
      </View>
      <Text style={styles.copyright}>© Ossai {new Date().getFullYear()}. All rights reserved.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 32,
    marginTop: 48,
  },
  columns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
    marginBottom: 32,
  },
  column: { minWidth: 120, flex: 1 },
  columnTitle: {
    color: colors.textMuted,
    fontSize: 9,
    letterSpacing: 3,
    marginBottom: 12,
  },
  link: {
    color: colors.text,
    fontSize: 13,
    marginBottom: 8,
    textDecorationLine: 'none',
  },
  copyright: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 1,
  },
});
