import { BlurView } from 'expo-blur';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getCachedShopLive,
  grantSiteAccess,
  isSiteAccessGranted,
  setCachedShopLive,
} from '../lib/accessSession';
import { fetchSiteStatus, verifySitePassword } from '../lib/callables';

const HEADER_HEIGHT = 110;

export default function SiteHeader() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [shopLive, setShopLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const granted = isSiteAccessGranted();
    setUnlocked(granted);
    setShopLive(getCachedShopLive());
    if (granted) {
      fetchSiteStatus()
        .then((s) => {
          setShopLive(s.shopLive);
          setCachedShopLive(s.shopLive);
        })
        .catch(() => undefined);
    }
  }, []);

  const handleUnlock = async () => {
    if (loading || !password.trim()) return;
    setLoading(true);
    setError(false);
    try {
      const result = await verifySitePassword(password.trim());
      grantSiteAccess(result.shopLive);
      setUnlocked(true);
      setShopLive(result.shopLive);
      setPassword('');
      router.push('/shop');
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

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
            {unlocked && (
              <Link href="/shop" asChild>
                <TouchableOpacity style={styles.shopLink} activeOpacity={0.7}>
                  <Text style={styles.shopLinkText}>SHOP</Text>
                </TouchableOpacity>
              </Link>
            )}
            {!unlocked && (
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.passwordInput, error && styles.passwordInputError]}
                  placeholder="Enter password"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setError(false);
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  onSubmitEditing={handleUnlock}
                />
                <TouchableOpacity
                  style={styles.enterBtn}
                  onPress={handleUnlock}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.enterBtnText}>ENTER</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        {unlocked && (
          <Text style={styles.statusLine}>
            {shopLive ? 'Exhibition open' : 'Exhibition closed'}
          </Text>
        )}
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
    paddingBottom: 6,
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
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 280,
    width: '100%',
  },
  passwordInput: {
    flex: 1,
    height: 36,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    paddingHorizontal: 10,
    color: '#fff',
    fontSize: 13,
    borderWidth: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {}),
  },
  passwordInputError: {
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  enterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  enterBtnText: {
    color: '#fff',
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '600',
  },
  shopLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  shopLinkText: {
    color: '#fff',
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '600',
  },
  statusLine: {
    textAlign: 'center',
    color: '#8e8e93',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
});
