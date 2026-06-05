import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import ContentPageRenderer from '../components/ContentPageRenderer';
import PageShell from '../components/PageShell';
import { loadPageBySlug } from '../lib/catalog';
import { DEFAULT_ABOUT, mergePage } from '../lib/contentDefaults';
import type { ContentPage } from '../lib/siteTypes';

export default function AboutScreen() {
  const [page, setPage] = useState<ContentPage | null>(null);

  useEffect(() => {
    loadPageBySlug('about')
      .then((p) => setPage(mergePage(DEFAULT_ABOUT, p)))
      .catch(() => setPage(DEFAULT_ABOUT));
  }, []);

  if (!page) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <PageShell tag="OSSAI" title={page.title.toUpperCase()}>
      <ContentPageRenderer page={page} />
    </PageShell>
  );
}
