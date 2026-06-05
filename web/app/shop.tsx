import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import PageShell from '../components/PageShell';
import ProductGrid from '../components/ProductGrid';
import { copyToClipboard, getStoredSignupId, setStoredSignupId } from '../lib/accessSession';
import { loadActiveCollections, loadActiveProducts } from '../lib/catalog';
import { classifyContact } from '../lib/classifyContact';
import { fetchMyDiscount } from '../lib/callables';
import { setStoredDiscountCode } from '../lib/cartContext';
import type { Product } from '../lib/productTypes';
import { useSite } from '../lib/siteContext';
import type { Collection } from '../lib/siteTypes';
import { colors } from '../lib/theme';
import { useRequireAccess } from '../lib/useRequireAccess';

export default function ShopScreen() {
  const allowed = useRequireAccess();
  const { shopLive, config } = useSite();
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [discountCode, setDiscountCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(10);
  const [lookupContact, setLookupContact] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const loadDiscount = useCallback(async () => {
    const signupId = getStoredSignupId();
    if (signupId) {
      try {
        const d = await fetchMyDiscount({ signupId });
        setDiscountCode(d.discountCode);
        setDiscountPercent(d.discountPercent);
        if (d.discountCode) setStoredDiscountCode(d.discountCode);
        if (d.signupId) setStoredSignupId(d.signupId);
      } catch {
        /* optional */
      }
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    loadDiscount().catch(() => undefined);
    Promise.all([loadActiveProducts(), loadActiveCollections()])
      .then(([prods, cols]) => {
        setProducts(prods);
        setCollections(cols);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [allowed, loadDiscount]);

  const handleLookup = async () => {
    const contact = classifyContact(lookupContact);
    if (!contact) {
      setLookupError('Enter a valid email or phone number.');
      return;
    }
    setLookupLoading(true);
    setLookupError('');
    try {
      const d = await fetchMyDiscount({ contact: contact.value });
      if (!d.discountCode) {
        setLookupError('No discount code on file yet.');
        return;
      }
      setDiscountCode(d.discountCode);
      setDiscountPercent(d.discountPercent);
      if (d.discountCode) setStoredDiscountCode(d.discountCode);
      if (d.signupId) setStoredSignupId(d.signupId);
    } catch {
      setLookupError('No signup found for that contact.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!discountCode) return;
    const ok = await copyToClipboard(discountCode);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!allowed) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  const featuredHandle = config.featuredCollectionHandle || 'ss26';

  return (
    <PageShell tag="PRIVATE EXHIBITION" title="SHOP">
      <Text style={styles.heroSub}>Contemporary form. Quiet utility. Limited quantities.</Text>

      {collections.length > 0 && (
        <View style={styles.collectionRow}>
          {collections.map((c) => (
            <Link key={c.id} href={`/shop/collections/${c.handle}` as never} asChild>
              <TouchableOpacity style={styles.collectionChip} activeOpacity={0.8}>
                <Text style={styles.collectionChipText}>{c.title.toUpperCase()}</Text>
              </TouchableOpacity>
            </Link>
          ))}
        </View>
      )}

      <Link href={`/shop/collections/${featuredHandle}` as never} asChild>
        <TouchableOpacity style={styles.featuredBanner} activeOpacity={0.85}>
          <Text style={styles.featuredLabel}>CURRENT DROP</Text>
          <Text style={styles.featuredTitle}>VIEW SS26 COLLECTION →</Text>
        </TouchableOpacity>
      </Link>

      <View style={styles.discountCard}>
        <Text style={styles.discountLabel}>YOUR DISCOUNT</Text>
        {discountCode ? (
          <>
            <Text style={styles.discountCode}>{discountCode}</Text>
            <Text style={styles.discountPercent}>{discountPercent}% OFF AT CHECKOUT</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.7}>
              <Text style={styles.copyBtnText}>{copied ? 'COPIED' : 'COPY CODE'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.lookupRow}>
            <TextInput
              style={styles.lookupInput}
              placeholder="Email or number you signed up with"
              placeholderTextColor="#666"
              value={lookupContact}
              onChangeText={setLookupContact}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.lookupBtn} onPress={handleLookup} disabled={lookupLoading}>
              {lookupLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.lookupBtnText}>SHOW</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        {lookupError ? <Text style={styles.lookupError}>{lookupError}</Text> : null}
      </View>

      {!shopLive ? (
        <View style={styles.closedBox}>
          <Text style={styles.closedTitle}>EXHIBITION CLOSED</Text>
          <Text style={styles.closedSub}>
            The collection is visible but purchases are paused until we go live.
          </Text>
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>ALL PIECES</Text>
      {loading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      ) : products.length === 0 ? (
        <Text style={styles.empty}>No pieces on display yet.</Text>
      ) : (
        <ProductGrid products={products} />
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  heroSub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  collectionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20, justifyContent: 'center' },
  collectionChip: { borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 14 },
  collectionChipText: { color: colors.text, fontSize: 9, letterSpacing: 2 },
  featuredBanner: {
    borderWidth: 1,
    borderColor: colors.text,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
  },
  featuredLabel: { color: colors.textMuted, fontSize: 9, letterSpacing: 4, marginBottom: 8 },
  featuredTitle: { color: colors.text, fontSize: 12, letterSpacing: 3 },
  discountCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  discountLabel: { color: colors.textMuted, fontSize: 10, letterSpacing: 4, marginBottom: 12 },
  discountCode: { color: colors.text, fontSize: 22, letterSpacing: 4, fontWeight: '600', marginBottom: 8 },
  discountPercent: { color: colors.textMuted, fontSize: 12, letterSpacing: 2, marginBottom: 16 },
  copyBtn: { borderWidth: 1, borderColor: colors.text, paddingVertical: 10, paddingHorizontal: 24 },
  copyBtnText: { color: colors.text, fontSize: 11, letterSpacing: 2 },
  lookupRow: { flexDirection: 'row', width: '100%', gap: 8, alignItems: 'center' },
  lookupInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 13,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {}),
  },
  lookupBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  lookupBtnText: { color: colors.text, fontSize: 11, letterSpacing: 2 },
  lookupError: { color: colors.error, fontSize: 12, marginTop: 12, textAlign: 'center' },
  closedBox: { borderWidth: 1, borderColor: colors.border, padding: 32, alignItems: 'center', marginBottom: 32 },
  closedTitle: { color: colors.text, fontSize: 14, letterSpacing: 4, marginBottom: 12 },
  closedSub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  sectionLabel: { color: colors.textMuted, fontSize: 10, letterSpacing: 4, marginBottom: 20, textAlign: 'center' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
});
