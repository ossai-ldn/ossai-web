import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import PageShell from '../../components/PageShell';
import ProductGallery from '../../components/ProductGallery';
import { loadProductBySlug } from '../../lib/catalog';
import { classifyContact } from '../../lib/classifyContact';
import { registerRestockAlert } from '../../lib/callables';
import { useCart } from '../../lib/cartContext';
import {
  getProductColors,
  getVariantsForColor,
  isProductPurchasable,
  type Product,
  type ProductVariant,
} from '../../lib/productTypes';
import { useSite } from '../../lib/siteContext';
import { colors } from '../../lib/theme';

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { shopLive, openDrawer } = useSite();
  const { addLine } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyStatus, setNotifyStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!slug) return;
    loadProductBySlug(slug)
      .then((p) => {
        setProduct(p);
        if (p) {
          const colors = getProductColors(p);
          setSelectedColor(colors[0] ?? '');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const colorVariants = useMemo(
    () => (product ? getVariantsForColor(product, selectedColor) : []),
    [product, selectedColor],
  );

  const selectedVariant: ProductVariant | undefined = colorVariants.find(
    (v) => v.size === selectedSize,
  );

  const canPurchase = product ? isProductPurchasable(product, shopLive) : false;
  const variantInStock = selectedVariant ? selectedVariant.stockQty > 0 : false;

  const handleAddToBag = () => {
    if (!product || !selectedVariant || !variantInStock || !canPurchase) return;
    addLine({
      productId: product.id,
      variantId: selectedVariant.id,
      title: product.title,
      size: selectedVariant.size,
      color: selectedVariant.color,
      priceDisplay: product.priceDisplay,
      imageUrl: product.imageFront,
      shopifyUrl: product.shopifyUrl,
      shopifyVariantId: selectedVariant.shopifyVariantId ?? product.shopifyVariantId,
      maxQty: selectedVariant.stockQty,
      qty: 1,
    });
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      openDrawer('bag');
    }, 400);
  };

  const handleNotify = async () => {
    if (!product || !selectedVariant) return;
    const contact = classifyContact(notifyEmail);
    if (!contact || contact.type !== 'email') {
      setNotifyStatus('error');
      return;
    }
    setNotifyStatus('loading');
    try {
      await registerRestockAlert({
        productId: product.id,
        variantId: selectedVariant.id,
        email: contact.value,
      });
      setNotifyStatus('done');
      setNotifyEmail('');
    } catch {
      setNotifyStatus('error');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!product) {
    return (
      <PageShell title="NOT FOUND">
        <Text style={styles.muted}>Piece not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16, alignSelf: 'center' }}>
          <Text style={styles.link}>← BACK TO SHOP</Text>
        </TouchableOpacity>
      </PageShell>
    );
  }

  const colors_available = getProductColors(product);
  const hasVariants = product.variants.length > 0;
  const showNotify = hasVariants && selectedVariant && selectedVariant.stockQty === 0;

  return (
    <PageShell showFooter>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.link}>← SHOP</Text>
          </TouchableOpacity>

          <ProductGallery urls={product.galleryUrls} />

          <Text style={styles.title}>{product.title.toUpperCase()}</Text>
          <View style={styles.priceRow}>
            {product.compareAtPrice ? (
              <Text style={styles.comparePrice}>{product.compareAtPrice}</Text>
            ) : null}
            <Text style={styles.price}>
              {product.priceFrom ? `FROM ${product.priceDisplay}` : product.priceDisplay}
            </Text>
          </View>

          {product.comingSoon ? (
            <Text style={styles.statusLabel}>COMING SOON</Text>
          ) : product.soldOut ? (
            <Text style={styles.statusLabel}>SOLD OUT</Text>
          ) : !shopLive ? (
            <Text style={styles.statusLabel}>EXHIBITION CLOSED</Text>
          ) : null}

          {colors_available.length > 1 && (
            <View style={styles.selectorSection}>
              <Text style={styles.selectorLabel}>COLOUR</Text>
              <View style={styles.optionRow}>
                {colors_available.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.optionBtn, selectedColor === c && styles.optionActive]}
                    onPress={() => {
                      setSelectedColor(c);
                      setSelectedSize('');
                    }}
                  >
                    <Text style={styles.optionText}>{c || 'DEFAULT'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {hasVariants && (
            <View style={styles.selectorSection}>
              <Text style={styles.selectorLabel}>SIZE</Text>
              <View style={styles.optionRow}>
                {colorVariants.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.sizeBtn, selectedSize === v.size && styles.optionActive]}
                    onPress={() => setSelectedSize(v.size)}
                  >
                    <Text style={styles.optionText}>{v.size}</Text>
                    {v.stockQty > 0 && v.stockQty <= 3 ? (
                      <Text style={styles.stockHint}>{v.stockQty} left</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {hasVariants ? (
            canPurchase && variantInStock && selectedSize ? (
              <TouchableOpacity style={styles.ctaBtn} onPress={handleAddToBag} activeOpacity={0.8}>
                <Text style={styles.ctaText}>{added ? 'ADDED' : 'ADD TO BAG'}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.ctaDisabled}>
                <Text style={styles.ctaDisabledText}>
                  {!selectedSize
                    ? 'Select a size'
                    : product.comingSoon
                      ? 'Coming soon'
                      : 'Sold out'}
                </Text>
              </View>
            )
          ) : canPurchase ? (
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => product.shopifyUrl && Linking.openURL(product.shopifyUrl)}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaText}>BUY ON SHOPIFY</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.ctaDisabled}>
              <Text style={styles.ctaDisabledText}>Not available</Text>
            </View>
          )}

          <Text style={styles.klarna}>Pay later with Klarna. Learn more at checkout.</Text>

          {product.modelInfo ? <Text style={styles.modelInfo}>{product.modelInfo}</Text> : null}
          {product.description ? <Text style={styles.body}>{product.description}</Text> : null}

          {product.features.length > 0 && (
            <View style={styles.features}>
              {product.features.map((f, i) => (
                <Text key={i} style={styles.featureItem}>
                  · {f}
                </Text>
              ))}
            </View>
          )}

          {hasVariants && selectedVariant?.measurements && (
            <View style={styles.measurements}>
              <Text style={styles.selectorLabel}>GARMENT MEASUREMENTS — {selectedVariant.size}</Text>
              <View style={styles.measureTable}>
                {selectedVariant.measurements.chest ? (
                  <Text style={styles.measureRow}>Chest: {selectedVariant.measurements.chest}</Text>
                ) : null}
                {selectedVariant.measurements.sleeve ? (
                  <Text style={styles.measureRow}>Sleeve: {selectedVariant.measurements.sleeve}</Text>
                ) : null}
                {selectedVariant.measurements.length ? (
                  <Text style={styles.measureRow}>Length: {selectedVariant.measurements.length}</Text>
                ) : null}
              </View>
            </View>
          )}

          {product.sizeGuideSlug ? (
            <TouchableOpacity onPress={() => router.push(`/policies/${product.sizeGuideSlug}` as never)}>
              <Text style={styles.sizeGuide}>SIZE GUIDE →</Text>
            </TouchableOpacity>
          ) : null}

          {product.details ? (
            <View style={styles.detailsBox}>
              <Text style={styles.selectorLabel}>DETAILS</Text>
              <Text style={styles.body}>{product.details}</Text>
            </View>
          ) : null}

          {showNotify && (
            <View style={styles.notifyBox}>
              <Text style={styles.selectorLabel}>NOTIFY ME WHEN AVAILABLE</Text>
              <TextInput
                style={styles.notifyInput}
                placeholder="Your email"
                placeholderTextColor="#666"
                value={notifyEmail}
                onChangeText={setNotifyEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TouchableOpacity
                style={styles.notifyBtn}
                onPress={handleNotify}
                disabled={notifyStatus === 'loading'}
              >
                <Text style={styles.notifyBtnText}>
                  {notifyStatus === 'done' ? 'REGISTERED' : notifyStatus === 'loading' ? '...' : 'NOTIFY ME'}
                </Text>
              </TouchableOpacity>
              {notifyStatus === 'error' ? (
                <Text style={styles.notifyError}>Enter a valid email.</Text>
              ) : null}
            </View>
          )}

          <View style={styles.helpStrip}>
            <Text style={styles.selectorLabel}>NEED HELP?</Text>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:support@ossai.co.uk')}>
              <Text style={styles.helpLink}>support@ossai.co.uk</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://wa.me/')}>
              <Text style={styles.helpLink}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://instagram.com/ossai')}>
              <Text style={styles.helpLink}>Instagram</Text>
            </TouchableOpacity>
          </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  back: { marginBottom: 20, alignSelf: 'flex-start' },
  link: { color: colors.textMuted, fontSize: 11, letterSpacing: 2 },
  title: { color: colors.text, fontSize: 20, letterSpacing: 4, marginBottom: 8, textAlign: 'center' },
  priceRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 16 },
  price: { color: colors.textMuted, fontSize: 16, textAlign: 'center' },
  comparePrice: { color: colors.textMuted, fontSize: 14, textDecorationLine: 'line-through' },
  statusLabel: { color: colors.error, fontSize: 11, letterSpacing: 3, textAlign: 'center', marginBottom: 20 },
  selectorSection: { marginBottom: 20 },
  selectorLabel: { color: colors.textMuted, fontSize: 10, letterSpacing: 4, marginBottom: 10, textAlign: 'center' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  optionBtn: { borderWidth: 1, borderColor: colors.border, paddingVertical: 10, paddingHorizontal: 16 },
  sizeBtn: { borderWidth: 1, borderColor: colors.border, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', minWidth: 52 },
  optionActive: { borderColor: colors.text },
  optionText: { color: colors.text, fontSize: 11, letterSpacing: 1 },
  stockHint: { color: colors.textMuted, fontSize: 8, marginTop: 4 },
  ctaBtn: { borderWidth: 1, borderColor: colors.text, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  ctaText: { color: colors.text, fontSize: 12, letterSpacing: 3 },
  ctaDisabled: { paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  ctaDisabledText: { color: '#666', fontSize: 12 },
  klarna: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginBottom: 24, letterSpacing: 1 },
  modelInfo: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 16 },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 20, textAlign: 'center' },
  features: { marginBottom: 24, alignItems: 'center' },
  featureItem: { color: colors.textSecondary, fontSize: 13, lineHeight: 22 },
  measurements: { marginBottom: 24 },
  measureTable: { alignItems: 'center', gap: 4 },
  measureRow: { color: colors.textSecondary, fontSize: 13 },
  sizeGuide: { color: colors.text, fontSize: 11, letterSpacing: 2, textAlign: 'center', marginBottom: 24 },
  detailsBox: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 20, marginBottom: 24 },
  notifyBox: { borderWidth: 1, borderColor: colors.border, padding: 20, marginBottom: 24 },
  notifyInput: {
    backgroundColor: colors.surface,
    color: colors.text,
    padding: 12,
    marginBottom: 12,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {}),
  },
  notifyBtn: { borderWidth: 1, borderColor: colors.text, paddingVertical: 12, alignItems: 'center' },
  notifyBtnText: { color: colors.text, fontSize: 11, letterSpacing: 2 },
  notifyError: { color: colors.error, fontSize: 12, marginTop: 8, textAlign: 'center' },
  helpStrip: { alignItems: 'center', gap: 8, paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.border },
  helpLink: { color: colors.text, fontSize: 12, letterSpacing: 1, textDecorationLine: 'underline' },
  muted: { color: colors.textMuted, textAlign: 'center' },
});
