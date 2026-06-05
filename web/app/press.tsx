import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PageShell from '../components/PageShell';
import { loadPressItems } from '../lib/pressArchives';
import type { PressItem } from '../lib/siteTypes';
import { colors } from '../lib/theme';

export default function PressScreen() {
  const [items, setItems] = useState<PressItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPressItems()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageShell title="PRESS">
      {loading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 32 }} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Press coverage coming soon.</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.item}>
            <Text style={styles.quote}>"{item.quote}"</Text>
            <Text style={styles.source}>— {item.source}</Text>
            {item.url ? (
              <TouchableOpacity onPress={() => Linking.openURL(item.url)}>
                <Text style={styles.link}>READ ARTICLE →</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  item: { marginBottom: 40, alignItems: 'center' },
  quote: { color: colors.text, fontSize: 16, lineHeight: 26, fontStyle: 'italic', textAlign: 'center', marginBottom: 12 },
  source: { color: colors.textMuted, fontSize: 11, letterSpacing: 2, marginBottom: 12 },
  link: { color: colors.text, fontSize: 11, letterSpacing: 2, textDecorationLine: 'underline' },
});
