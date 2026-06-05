import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { isSiteAccessGranted } from '../lib/accessSession';
import { isGatedPath } from '../lib/gatedRoutes';
import { colors } from '../lib/theme';
import { useSite } from '../lib/siteContext';
import type { AnnouncementMessage } from '../lib/siteTypes';

const ROTATE_MS = 5000;

export default function AnnouncementBar() {
  const { config } = useSite();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(isSiteAccessGranted);
  const messages = config.announcementBar.messages.filter((m) => m.text.trim());
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const sync = () => setHasAccess(isSiteAccessGranted());
    sync();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', sync);
      return () => window.removeEventListener('storage', sync);
    }
  }, []);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [messages.length]);

  if (!config.announcementBar.enabled || messages.length === 0) return null;

  const current: AnnouncementMessage = messages[index] ?? messages[0];
  const link = current.link?.trim();
  const linkIsGated = link ? isGatedPath(link) : false;
  const canFollowLink = link && (!linkIsGated || hasAccess);

  const content = (
    <Text style={styles.text} numberOfLines={1}>
      {current.text}
    </Text>
  );

  return (
    <View style={styles.bar}>
      {canFollowLink ? (
        <Link href={link as never} asChild>
          <TouchableOpacity style={styles.inner} activeOpacity={0.8}>
            {content}
          </TouchableOpacity>
        </Link>
      ) : link && linkIsGated ? (
        <TouchableOpacity
          style={styles.inner}
          activeOpacity={0.8}
          onPress={() => router.replace('/')}
        >
          {content}
        </TouchableOpacity>
      ) : (
        <View style={styles.inner}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    height: 32,
    justifyContent: 'center',
  },
  inner: {
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.text,
    fontSize: 10,
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
