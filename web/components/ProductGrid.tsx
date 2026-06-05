import { Platform, StyleSheet, View } from 'react-native';
import type { Product } from '../lib/productTypes';
import ProductCard from './ProductCard';

type Props = {
  products: Product[];
};

export default function ProductGrid({ products }: Props) {
  return (
    <View style={styles.grid}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
});
