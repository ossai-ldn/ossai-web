import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors } from '../lib/theme';

type Props = {
  urls: string[];
};

export default function ProductGallery({ urls }: Props) {
  const images = urls.filter(Boolean);
  const [active, setActive] = useState(0);

  if (images.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Image source={{ uri: images[active] }} style={styles.main} contentFit="cover" />
      {images.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbs}>
          {images.map((url, i) => (
            <TouchableOpacity key={i} onPress={() => setActive(i)} activeOpacity={0.8}>
              <Image
                source={{ uri: url }}
                style={[styles.thumb, i === active && styles.thumbActive]}
                contentFit="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 24, width: '100%', maxWidth: 520, alignSelf: 'center' },
  main: { width: '100%', aspectRatio: 0.85, backgroundColor: colors.surface },
  thumbs: { marginTop: 12 },
  thumb: {
    width: 56,
    height: 68,
    marginRight: 8,
    opacity: 0.5,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  thumbActive: { opacity: 1, borderColor: colors.text },
});
