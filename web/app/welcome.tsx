import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SITE_HEADER_HEIGHT } from '../components/SiteHeader';
import { setStoredSignupId } from '../lib/accessSession';
import { verifyWelcomeLink } from '../lib/callables';

type State = 'loading' | 'ok' | 'error';

export default function WelcomeLinkScreen() {
  const { sid, t } = useLocalSearchParams<{ sid?: string; t?: string }>();
  const router = useRouter();
  const [state, setState] = useState<State>('loading');
  const [discountLine, setDiscountLine] = useState('');

  useEffect(() => {
    const signupId = typeof sid === 'string' ? sid.trim() : '';
    const token = typeof t === 'string' ? t.trim() : '';

    if (!signupId || !token) {
      setState('error');
      return;
    }

    verifyWelcomeLink({ signupId, token })
      .then((result) => {
        setStoredSignupId(result.signupId);
        setDiscountLine(`${result.discountCode} · ${result.discountPercent}% off`);
        setState('ok');
      })
      .catch(() => setState('error'));
  }, [sid, t]);

  return (
    <View style={styles.container}>
      <View style={[styles.centered, { paddingTop: SITE_HEADER_HEIGHT }]}>
        {state === 'loading' && (
          <>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={styles.muted}>Linking your access…</Text>
          </>
        )}

        {state === 'ok' && (
          <>
            <Text style={styles.title}>YOU&apos;RE LINKED</Text>
            <Text style={styles.body}>
              This browser is now connected to your Ossai signup.
            </Text>
            {discountLine ? <Text style={styles.code}>{discountLine}</Text> : null}
            <Text style={styles.hint}>
              Enter the site password to open the shop — your discount will load automatically.
            </Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.replace('/shop')}>
              <Text style={styles.btnText}>GO TO SHOP</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/')}>
              <Text style={styles.link}>Back to home</Text>
            </TouchableOpacity>
          </>
        )}

        {state === 'error' && (
          <>
            <Text style={styles.title}>LINK INVALID</Text>
            <Text style={styles.body}>
              This welcome link is invalid or expired. Sign up again on the home page, or use your
              email on the shop discount lookup.
            </Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.replace('/')}>
              <Text style={styles.btnText}>HOME</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  title: {
    color: '#fff',
    fontSize: 16,
    letterSpacing: 5,
    marginBottom: 16,
    marginTop: 24,
    textAlign: 'center',
  },
  body: {
    color: '#8e8e93',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  code: {
    color: '#aaffbf',
    fontSize: 14,
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  hint: {
    color: '#8e8e93',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  muted: { color: '#8e8e93', marginTop: 16, fontSize: 13 },
  btn: {
    borderWidth: 1,
    borderColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginBottom: 16,
  },
  btnText: { color: '#fff', fontSize: 11, letterSpacing: 3 },
  link: { color: '#8e8e93', fontSize: 12 },
});
