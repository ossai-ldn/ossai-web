import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useHeaderOffset } from './SiteHeader';
import SiteFooter from './SiteFooter';
import { colors } from '../lib/theme';

type Props = {
  title?: string;
  tag?: string;
  children: React.ReactNode;
  showFooter?: boolean;
};

export default function PageShell({ title, tag, children, showFooter = true }: Props) {
  const headerOffset = useHeaderOffset();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: headerOffset + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {tag ? <Text style={styles.tag}>{tag}</Text> : null}
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {children}
        {showFooter ? <SiteFooter /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  tag: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 5,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '300',
  },
});
