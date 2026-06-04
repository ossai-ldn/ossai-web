import { Link } from 'expo-router';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ProductImageFlip } from './ProductImageFlip';

export type ProductCardData = {
  id: string;
  slug: string;
  title: string;
  priceDisplay: string;
  imageFront: string;
  imageBack: string;
  soldOut: boolean;
};

type Props = {
  product: ProductCardData;
};

export default function ProductCard({ product }: Props) {
  const href = `/shop/${product.slug}` as const;

  return (
    <Link href={href} asChild>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={product.soldOut ? 1 : 0.85}
        disabled={false}
      >
        <ProductImageFlip
          frontUri={product.imageFront}
          backUri={product.imageBack}
          style={styles.imageWrap}
          soldOut={product.soldOut}
        />
        {product.soldOut && (
          <View style={styles.soldOutBadge}>
            <Text style={styles.soldOutText}>SOLD OUT</Text>
          </View>
        )}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {product.title.toUpperCase()}
        </Text>
        {product.priceDisplay ? (
          <Text style={styles.cardPrice}>{product.priceDisplay}</Text>
        ) : null}
      </TouchableOpacity>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    width: Platform.OS === 'web' ? '48%' : '47%',
    marginBottom: 8,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 0.85,
    marginBottom: 10,
  },
  soldOutBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  soldOutText: { color: '#fff', fontSize: 9, letterSpacing: 2 },
  cardTitle: { color: '#fff', fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  cardPrice: { color: '#8e8e93', fontSize: 12 },
});
