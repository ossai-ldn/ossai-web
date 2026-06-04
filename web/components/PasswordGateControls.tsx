import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { grantSiteAccess, isSiteAccessGranted, setCachedShopLive } from '../lib/accessSession';
import { fetchSiteStatus, verifySitePassword } from '../lib/callables';

type Props = {
  /** When true, navigating to /shop after unlock (default on home). */
  navigateOnUnlock?: boolean;
};

export default function PasswordGateControls({ navigateOnUnlock = true }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const granted = isSiteAccessGranted();
    setUnlocked(granted);
    if (granted) {
      fetchSiteStatus()
        .then((s) => setCachedShopLive(s.shopLive))
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
      setPassword('');
      if (navigateOnUnlock) {
        router.push('/shop');
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (unlocked) {
    return (
      <View style={styles.unlockedRow}>
        <Link href="/shop" asChild>
          <TouchableOpacity style={styles.shopLink} activeOpacity={0.7}>
            <Text style={styles.shopLinkText}>SHOP</Text>
          </TouchableOpacity>
        </Link>
      </View>
    );
  }

  return (
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
  );
}

const styles = StyleSheet.create({
  unlockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 260,
  },
  passwordInput: {
    width: 140,
    height: 36,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    paddingHorizontal: 10,
    color: '#fff',
    fontSize: 12,
    borderWidth: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {}),
  },
  passwordInputError: {
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  enterBtn: {
    paddingHorizontal: 8,
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
});
