import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import ContentPageRenderer from '../../components/ContentPageRenderer';
import PageShell from '../../components/PageShell';
import { loadPageBySlug } from '../../lib/catalog';
import { DEFAULT_POLICIES, mergePage } from '../../lib/contentDefaults';
import type { ContentPage } from '../../lib/siteTypes';

export default function PolicyScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [page, setPage] = useState<ContentPage | null>(null);

  useEffect(() => {
    if (!slug) return;
    const fallback = DEFAULT_POLICIES[slug] ?? {
      id: slug,
      slug,
      title: slug.charAt(0).toUpperCase() + slug.slice(1),
      sections: [{ type: 'text' as const, body: 'Content coming soon.' }],
      active: true,
    };
    loadPageBySlug(slug)
      .then((p) => setPage(mergePage(fallback, p)))
      .catch(() => setPage(fallback));
  }, [slug]);

  if (!page) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <PageShell title={page.title.toUpperCase()}>
      <ContentPageRenderer page={page} />
    </PageShell>
  );
}
