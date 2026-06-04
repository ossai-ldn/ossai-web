import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ProductCard from '../components/ProductCard';
import { SITE_HEADER_HEIGHT } from '../components/SiteHeader';
import {
  copyToClipboard,
  getCachedShopLive,
  getStoredSignupId,
  isSiteAccessGranted,
  setCachedShopLive,
  setStoredSignupId,
} from '../lib/accessSession';
import { classifyContact } from '../lib/classifyContact';
import { fetchMyDiscount, fetchSiteStatus } from '../lib/callables';
import { db } from '../lib/firebase';
import { mapProductDoc, type Product } from '../lib/productTypes';

export default function ShopScreen() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [shopLive, setShopLive] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
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
        if (d.signupId) setStoredSignupId(d.signupId);
        return;
      } catch {
        /* fall through to contact lookup */
      }
    }
  }, []);

  useEffect(() => {
    if (!isSiteAccessGranted()) {
      router.replace('/');
      return;
    }
    setAllowed(true);
    setShopLive(getCachedShopLive());

    fetchSiteStatus()
      .then((s) => {
        setShopLive(s.shopLive);
        setCachedShopLive(s.shopLive);
      })
      .catch(() => undefined);

    loadDiscount().catch(() => undefined);

    const loadProducts = async () => {
      const q = query(
        collection(db, 'products'),
        where('active', '==', true),
        orderBy('sortOrder', 'asc'),
      );
      const snap = await getDocs(q);
      setProducts(snap.docs.map((doc) => mapProductDoc(doc.id, doc.data() as Record<string, unknown>)));
      setLoading(false);
    };

    loadProducts().catch(() => setLoading(false));
  }, [router, loadDiscount]);

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
        setLookupError('No discount code on file yet. Try again in a moment.');
        return;
      }
      setDiscountCode(d.discountCode);
      setDiscountPercent(d.discountPercent);
      if (d.signupId) setStoredSignupId(d.signupId);
    } catch (e: unknown) {
      const code =
        e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
      if (code === 'functions/not-found') {
        setLookupError('No signup found for that email or number.');
      } else {
        setLookupError('Could not load your code. Check your connection and try again.');
      }
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

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: SITE_HEADER_HEIGHT + 24,
          paddingBottom: 48,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heroTag}>PRIVATE EXHIBITION</Text>
        <Text style={styles.heroTitle}>SS26</Text>
        <Text style={styles.heroSub}>Contemporary form. Quiet utility. Limited quantities.</Text>

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
              <TouchableOpacity
                style={styles.lookupBtn}
                onPress={handleLookup}
                disabled={lookupLoading}
              >
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
              The collection is not open for purchase. Your access remains active for when we go
              live.
            </Text>
          </View>
        ) : loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
        ) : products.length === 0 ? (
          <Text style={styles.empty}>No pieces on display yet.</Text>
        ) : (
          <View style={styles.grid}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  heroTag: {
    color: '#8e8e93',
    fontSize: 10,
    letterSpacing: 5,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 32,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '400',
    marginBottom: 8,
  },
  heroSub: {
    color: '#8e8e93',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  discountCard: {
    borderWidth: 1,
    borderColor: '#2c2c2e',
    backgroundColor: '#1c1c1e',
    padding: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  discountLabel: {
    color: '#8e8e93',
    fontSize: 10,
    letterSpacing: 4,
    marginBottom: 12,
  },
  discountCode: {
    color: '#fff',
    fontSize: 22,
    letterSpacing: 4,
    fontWeight: '600',
    marginBottom: 8,
  },
  discountPercent: {
    color: '#8e8e93',
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 16,
  },
  copyBtn: {
    borderWidth: 1,
    borderColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  copyBtnText: { color: '#fff', fontSize: 11, letterSpacing: 2 },
  lookupRow: { flexDirection: 'row', width: '100%', gap: 8, alignItems: 'center' },
  lookupInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#fff',
    fontSize: 13,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {}),
  },
  lookupBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  lookupBtnText: { color: '#fff', fontSize: 11, letterSpacing: 2 },
  lookupError: {
    color: '#ff918b',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
  closedBox: {
    borderWidth: 1,
    borderColor: '#2c2c2e',
    padding: 32,
    alignItems: 'center',
  },
  closedTitle: { color: '#fff', fontSize: 14, letterSpacing: 4, marginBottom: 12 },
  closedSub: { color: '#8e8e93', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  empty: { color: '#8e8e93', textAlign: 'center', marginTop: 24 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
});
