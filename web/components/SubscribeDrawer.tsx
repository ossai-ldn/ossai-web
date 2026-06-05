import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { setStoredSignupId } from '../lib/accessSession';
import { classifyContact } from '../lib/classifyContact';
import { registerSignup } from '../lib/callables';
import { setStoredDiscountCode } from '../lib/cartContext';
import { useSite } from '../lib/siteContext';
import { colors } from '../lib/theme';
import DrawerPanel from './DrawerPanel';

export default function SubscribeDrawer() {
  const { activeDrawer, closeDrawer, config } = useSite();
  const visible = activeDrawer === 'subscribe';
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ code: string; percent: number } | null>(null);

  const handleSubmit = async () => {
    const parsed = classifyContact(contact);
    if (!parsed) {
      setError('Enter a valid email or phone number.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await registerSignup({
        contact: parsed.value,
        source: 'subscribe-drawer',
        userAgent: Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.userAgent : Platform.OS,
      });
      setStoredSignupId(result.signupId);
      if (result.discountCode) setStoredDiscountCode(result.discountCode);
      setSuccess({ code: result.discountCode, percent: result.discountPercent });
      setContact('');
    } catch {
      setError('Could not complete signup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess(null);
    setError('');
    closeDrawer();
  };

  return (
    <DrawerPanel visible={visible} onClose={handleClose} title="JOIN OUR MAILING LIST">
      <View style={styles.content}>
        <Text style={styles.sub}>
          {config.newsletterPromoText ||
            'Early access to drops, private exhibitions, and exclusive offers.'}
        </Text>

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>WELCOME</Text>
            <Text style={styles.code}>{success.code}</Text>
            <Text style={styles.codeSub}>{success.percent}% OFF YOUR FIRST ORDER</Text>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email or phone"
              placeholderTextColor="#666"
              value={contact}
              onChangeText={setContact}
              autoCapitalize="none"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitText}>SUBSCRIBE</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </DrawerPanel>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  sub: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 24 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {}),
  },
  error: { color: colors.error, fontSize: 12, marginBottom: 12 },
  submitBtn: {
    borderWidth: 1,
    borderColor: colors.text,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: { color: colors.text, fontSize: 11, letterSpacing: 3 },
  successBox: { alignItems: 'center', paddingTop: 24 },
  successTitle: { color: colors.textMuted, fontSize: 10, letterSpacing: 4, marginBottom: 16 },
  code: { color: colors.text, fontSize: 22, letterSpacing: 4, marginBottom: 8 },
  codeSub: { color: colors.success, fontSize: 12, letterSpacing: 2 },
});
