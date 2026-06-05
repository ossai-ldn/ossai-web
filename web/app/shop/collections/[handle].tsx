import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import PageShell from '../../../components/PageShell';
import ProductGrid from '../../../components/ProductGrid';
import {
  filterProducts,
  loadActiveProducts,
  loadCollectionByHandle,
  sortProducts,
  type SortOption,
} from '../../../lib/catalog';
import type { Collection } from '../../../lib/siteTypes';
import type { Product } from '../../../lib/productTypes';
import { colors } from '../../../lib/theme';
import { useRequireAccess } from '../../../lib/useRequireAccess';

export default function CollectionScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const allowed = useRequireAccess();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortOption>('newest');
  const [filterAvail, setFilterAvail] = useState<'all' | 'in-stock' | 'coming-soon'>('all');

  useEffect(() => {
    if (!allowed || !handle) return;
    const load = async () => {
      const [col, allProducts] = await Promise.all([
        loadCollectionByHandle(handle),
        loadActiveProducts(),
      ]);
      setCollection(col);
      const filtered = allProducts.filter((p) => p.collectionHandles.includes(handle));
      setProducts(filtered.length > 0 ? filtered : allProducts);
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, [allowed, handle]);

  const displayed = useMemo(() => {
    let list = products;
    if (filterAvail === 'in-stock') list = filterProducts(list, { availability: 'in-stock' });
    if (filterAvail === 'coming-soon') list = filterProducts(list, { availability: 'coming-soon' });
    return sortProducts(list, sort);
  }, [products, sort, filterAvail]);

  if (!allowed) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <PageShell
      tag={collection?.seasonLabel || 'COLLECTION'}
      title={(collection?.title || handle || '').toUpperCase()}
    >
      {collection?.heroImageUrl ? (
        <Image source={{ uri: collection.heroImageUrl }} style={styles.hero} resizeMode="cover" />
      ) : null}
      {collection?.description ? (
        <Text style={styles.description}>{collection.description}</Text>
      ) : null}

      <View style={styles.filters}>
        {(['all', 'in-stock', 'coming-soon'] as const).map((f) => (
          <TouchableOpacity key={f} onPress={() => setFilterAvail(f)} style={styles.filterBtn}>
            <Text style={[styles.filterText, filterAvail === f && styles.filterActive]}>
              {f === 'all' ? 'ALL' : f === 'in-stock' ? 'IN STOCK' : 'COMING SOON'}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.sortRow}>
          {(['newest', 'price-asc', 'price-desc'] as SortOption[]).map((s) => (
            <TouchableOpacity key={s} onPress={() => setSort(s)}>
              <Text style={[styles.filterText, sort === s && styles.filterActive]}>
                {s === 'newest' ? 'NEWEST' : s === 'price-asc' ? 'PRICE ↑' : 'PRICE ↓'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      ) : displayed.length === 0 ? (
        <Text style={styles.empty}>No pieces in this collection yet.</Text>
      ) : (
        <ProductGrid products={displayed} />
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  hero: { width: '100%', height: 200, marginBottom: 24 },
  description: { color: colors.textMuted, fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  filters: { marginBottom: 24, gap: 12 },
  filterBtn: { marginRight: 12 },
  filterText: { color: colors.textMuted, fontSize: 10, letterSpacing: 2, marginRight: 16 },
  filterActive: { color: colors.text },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
});
