import { collection, getDocs, query, where } from 'firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ProductImageFlip } from '../../components/ProductImageFlip';
import { ProductVideo } from '../../components/ProductVideo';
import SeoHead from '../../components/SeoHead';
import { SITE_HEADER_HEIGHT } from '../../components/SiteHeader';
import { SITE_NAME } from '../../lib/seo';
import { fetchSiteStatus } from '../../lib/callables';
import { getCachedShopLive, isSiteAccessGranted, setCachedShopLive } from '../../lib/accessSession';
import { db } from '../../lib/firebase';
import { mapProductDoc, type Product } from '../../lib/productTypes';

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [shopLive, setShopLive] = useState(getCachedShopLive());

  useEffect(() => {
    if (!isSiteAccessGranted()) {
      router.replace('/');
      return;
    }

    const load = async () => {
      if (!slug || typeof slug !== 'string') {
        setLoading(false);
        return;
      }
      const q = query(
        collection(db, 'products'),
        where('slug', '==', slug),
        where('active', '==', true),
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setProduct(null);
      } else {
        setProduct(mapProductDoc(snap.docs[0].id, snap.docs[0].data() as Record<string, unknown>));
      }
      setLoading(false);
    };

    load().catch(() => setLoading(false));

    fetchSiteStatus()
      .then((s) => {
        setShopLive(s.shopLive);
        setCachedShopLive(s.shopLive);
      })
      .catch(() => undefined);
  }, [slug, router]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Piece not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={styles.link}>Back to shop</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canBuy = shopLive && !product.soldOut;

  const productTitle = product.title.trim() || 'Piece';
  const productDescription =
    product.description.trim() ||
    `${productTitle} — limited piece from ${SITE_NAME}.`;

  return (
    <View style={styles.container}>
      <SeoHead
        title={`${productTitle} — ${SITE_NAME}`}
        description={productDescription}
        path={`/shop/${product.slug}`}
        noindex
        ogImage={product.imageFront || undefined}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: SITE_HEADER_HEIGHT + 24,
          paddingBottom: 48,
          paddingHorizontal: 20,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.link}>← SHOP</Text>
        </TouchableOpacity>

        <View style={styles.heroImage}>
          <ProductImageFlip
            frontUri={product.imageFront}
            backUri={product.imageBack}
            style={{ width: '100%', aspectRatio: 0.85 }}
            soldOut={product.soldOut}
          />
        </View>

        {product.videoUrl ? (
          <ProductVideo uri={product.videoUrl} style={{ marginBottom: 24, maxWidth: 480, alignSelf: 'center', width: '100%' }} />
        ) : null}

        <Text style={styles.title}>{product.title.toUpperCase()}</Text>
        {product.priceDisplay ? <Text style={styles.price}>{product.priceDisplay}</Text> : null}

        {product.soldOut ? (
          <Text style={styles.soldOutLabel}>SOLD OUT</Text>
        ) : !shopLive ? (
          <Text style={styles.soldOutLabel}>NOT AVAILABLE — EXHIBITION CLOSED</Text>
        ) : null}

        {product.description ? (
          <Text style={styles.body}>{product.description}</Text>
        ) : null}

        {product.details ? (
          <View style={styles.detailsBox}>
            <Text style={styles.detailsLabel}>DETAILS</Text>
            <Text style={styles.body}>{product.details}</Text>
          </View>
        ) : null}

        {canBuy && product.shopifyUrl ? (
          <TouchableOpacity
            style={styles.buyBtn}
            onPress={() => Linking.openURL(product.shopifyUrl)}
            activeOpacity={0.8}
          >
            <Text style={styles.buyBtnText}>BUY ON SHOPIFY</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.buyDisabled}>
            <Text style={styles.buyDisabledText}>
              {product.soldOut ? 'This piece is sold out.' : 'Purchases open when the exhibition is live.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  back: { marginBottom: 20 },
  link: { color: '#8e8e93', fontSize: 11, letterSpacing: 2 },
  heroImage: { marginBottom: 24, maxWidth: 480, alignSelf: 'center', width: '100%' },
  title: {
    color: '#fff',
    fontSize: 20,
    letterSpacing: 4,
    marginBottom: 8,
    textAlign: 'center',
  },
  price: { color: '#8e8e93', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  soldOutLabel: {
    color: '#ff918b',
    fontSize: 11,
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 20,
  },
  body: {
    color: '#c7c7cc',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  detailsBox: {
    borderTopWidth: 1,
    borderTopColor: '#2c2c2e',
    paddingTop: 20,
    marginBottom: 28,
  },
  detailsLabel: {
    color: '#8e8e93',
    fontSize: 10,
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 12,
  },
  buyBtn: {
    borderWidth: 1,
    borderColor: '#fff',
    paddingVertical: 14,
    alignItems: 'center',
    maxWidth: 320,
    alignSelf: 'center',
    width: '100%',
  },
  buyBtnText: { color: '#fff', fontSize: 12, letterSpacing: 3 },
  buyDisabled: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  buyDisabledText: { color: '#666', fontSize: 12, textAlign: 'center' },
  muted: { color: '#8e8e93' },
});
