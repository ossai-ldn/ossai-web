import { BlurView } from 'expo-blur';
import { Link } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PasswordGateControls from './PasswordGateControls';

const HEADER_HEIGHT = 110;

/** Compact header for /shop, /admin, etc. (home uses its own centered-logo header). */
export default function SiteHeader() {
  return (
    <BlurView intensity={30} tint="dark" style={styles.header}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.row}>
          <Link href="/" asChild>
            <TouchableOpacity style={styles.logoWrap} activeOpacity={0.8}>
              <Text style={styles.logoText}>OSSAI</Text>
            </TouchableOpacity>
          </Link>
          <View style={styles.right}>
            <PasswordGateControls navigateOnUnlock={false} />
          </View>
        </View>
      </SafeAreaView>
    </BlurView>
  );
}

export const SITE_HEADER_HEIGHT = HEADER_HEIGHT;

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    minHeight: 56,
  },
  logoWrap: {
    paddingVertical: 4,
  },
  logoText: {
    color: '#fff',
    fontSize: 18,
    letterSpacing: 6,
    fontWeight: '600',
  },
  right: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
});
