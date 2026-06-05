import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ContentPage, PageSection } from '../lib/siteTypes';
import { colors } from '../lib/theme';

function SectionBlock({ section }: { section: PageSection }) {
  switch (section.type) {
    case 'heading':
      return <Text style={styles.heading}>{section.title ?? section.body}</Text>;
    case 'faq':
      return (
        <View style={styles.faqItem}>
          <Text style={styles.faqQ}>{section.title}</Text>
          <Text style={styles.body}>{section.body}</Text>
        </View>
      );
    case 'quote':
      return (
        <View style={styles.quote}>
          <Text style={styles.quoteText}>"{section.body}"</Text>
          {section.title ? <Text style={styles.quoteSource}>— {section.title}</Text> : null}
        </View>
      );
    case 'link':
      return (
        <TouchableOpacity
          onPress={() => section.linkUrl && Linking.openURL(section.linkUrl)}
          style={styles.linkRow}
        >
          <Text style={styles.linkText}>{section.linkLabel ?? section.title ?? section.linkUrl}</Text>
        </TouchableOpacity>
      );
    default:
      return section.body ? <Text style={styles.body}>{section.body}</Text> : null;
  }
}

export default function ContentPageRenderer({ page }: { page: ContentPage }) {
  return (
    <View style={styles.wrap}>
      {page.sections.map((section, i) => (
        <SectionBlock key={i} section={section} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 24 },
  heading: {
    color: colors.text,
    fontSize: 14,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
  },
  faqItem: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 20,
    marginBottom: 8,
  },
  faqQ: {
    color: colors.text,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  quote: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  quoteText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 26,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
  },
  quoteSource: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 2,
  },
  linkRow: { paddingVertical: 8 },
  linkText: {
    color: colors.text,
    fontSize: 13,
    letterSpacing: 2,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
