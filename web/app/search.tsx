import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import PageShell from '../components/PageShell';
import ProductGrid from '../components/ProductGrid';
import ShopGate from '../components/ShopGate';
import { loadActiveProducts, searchProducts } from '../lib/catalog';
import type { Product } from '../lib/productTypes';
import { colors } from '../lib/theme';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState(typeof params.q === 'string' ? params.q : '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveProducts()
      .then((p) => {
        setProducts(p);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof params.q === 'string') setQuery(params.q);
  }, [params.q]);

  const results = useMemo(() => searchProducts(products, query), [products, query]);

  return (
    <ShopGate>
      <PageShell title="SEARCH">
        <TextInput
          style={styles.input}
          placeholder="Search pieces..."
          placeholderTextColor="#666"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoFocus
        />
        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 32 }} />
        ) : query.trim() ? (
          <>
            <Text style={styles.count}>
              {results.length} {results.length === 1 ? 'RESULT' : 'RESULTS'}
            </Text>
            {results.length === 0 ? (
              <Text style={styles.empty}>No pieces match your search.</Text>
            ) : (
              <ProductGrid products={results} />
            )}
          </>
        ) : (
          <Text style={styles.empty}>Enter a search term to find pieces.</Text>
        )}
      </PageShell>
    </ShopGate>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 24,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {}),
  },
  count: { color: colors.textMuted, fontSize: 10, letterSpacing: 3, marginBottom: 20, textAlign: 'center' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
});
