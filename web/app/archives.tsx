import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PageShell from '../components/PageShell';
import { loadArchives } from '../lib/pressArchives';
import type { ArchiveItem } from '../lib/siteTypes';
import { colors } from '../lib/theme';

export default function ArchivesScreen() {
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArchives()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageShell tag="LOOKBOOKS" title="ARCHIVES">
      {loading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 32 }} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Past collections will appear here.</Text>
      ) : (
        items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.row}
            onPress={() => item.url && Linking.openURL(item.url)}
            activeOpacity={item.url ? 0.7 : 1}
          >
            <Text style={styles.title}>{item.title}</Text>
            {item.season ? <Text style={styles.season}>{item.season}</Text> : null}
          </TouchableOpacity>
        ))
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  row: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 20,
    alignItems: 'center',
  },
  title: { color: colors.text, fontSize: 14, letterSpacing: 3, marginBottom: 4 },
  season: { color: colors.textMuted, fontSize: 11, letterSpacing: 2 },
});
