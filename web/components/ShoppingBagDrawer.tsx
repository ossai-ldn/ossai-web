import { Image } from 'expo-image';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCart } from '../lib/cartContext';
import { useSite } from '../lib/siteContext';
import { colors } from '../lib/theme';
import DrawerPanel from './DrawerPanel';

export default function ShoppingBagDrawer() {
  const { activeDrawer, closeDrawer, shopLive } = useSite();
  const { lines, itemCount, updateQty, removeLine, buildCheckoutUrl } = useCart();
  const visible = activeDrawer === 'bag';

  const handleCheckout = () => {
    const url = buildCheckoutUrl();
    if (url) Linking.openURL(url);
  };

  return (
    <DrawerPanel visible={visible} onClose={closeDrawer} title="SHOPPING BAG">
      {lines.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>YOUR BAG IS EMPTY</Text>
          <Text style={styles.emptySub}>Add pieces from the shop to continue.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {lines.map((line) => (
            <View key={line.variantId} style={styles.line}>
              {line.imageUrl ? (
                <Image source={{ uri: line.imageUrl }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]} />
              )}
              <View style={styles.lineInfo}>
                <Text style={styles.lineTitle}>{line.title}</Text>
                <Text style={styles.lineMeta}>
                  {[line.color, line.size].filter(Boolean).join(' · ')}
                </Text>
                <Text style={styles.linePrice}>{line.priceDisplay}</Text>
                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    onPress={() => updateQty(line.variantId, line.qty - 1)}
                    style={styles.qtyBtn}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qty}>{line.qty}</Text>
                  <TouchableOpacity
                    onPress={() => updateQty(line.variantId, line.qty + 1)}
                    style={styles.qtyBtn}
                    disabled={line.qty >= line.maxQty}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeLine(line.variantId)} style={styles.remove}>
                    <Text style={styles.removeText}>REMOVE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {lines.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.count}>
            {itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'}
          </Text>
          {shopLive ? (
            <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout} activeOpacity={0.8}>
              <Text style={styles.checkoutText}>CHECKOUT</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.offlineNote}>Exhibition is offline. Checkout unavailable.</Text>
          )}
        </View>
      )}
    </DrawerPanel>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyTitle: { color: colors.text, fontSize: 12, letterSpacing: 3, marginBottom: 8 },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  line: { flexDirection: 'row', gap: 12, marginBottom: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.border },
  thumb: { width: 72, height: 86, backgroundColor: colors.surface },
  thumbPlaceholder: { backgroundColor: colors.surface },
  lineInfo: { flex: 1 },
  lineTitle: { color: colors.text, fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  lineMeta: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
  linePrice: { color: colors.text, fontSize: 13, marginBottom: 8 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { borderWidth: 1, borderColor: colors.border, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { color: colors.text, fontSize: 16 },
  qty: { color: colors.text, fontSize: 13, minWidth: 20, textAlign: 'center' },
  remove: { marginLeft: 'auto' },
  removeText: { color: colors.textMuted, fontSize: 9, letterSpacing: 2 },
  footer: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 },
  count: { color: colors.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 12 },
  checkoutBtn: { borderWidth: 1, borderColor: colors.text, paddingVertical: 14, alignItems: 'center' },
  checkoutText: { color: colors.text, fontSize: 11, letterSpacing: 3 },
  offlineNote: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
});
