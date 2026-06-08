import { createElement } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

type Props = {
  uri: string;
  style?: ViewStyle;
};

/** HTML5 video player for product detail (web only). */
export function ProductVideo({ uri, style }: Props) {
  if (!uri || Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={[styles.wrap, style]}>
      {createElement('video', {
        src: uri,
        controls: true,
        playsInline: true,
        preload: 'metadata',
        style: {
          width: '100%',
          display: 'block',
          backgroundColor: '#1c1c1e',
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#1c1c1e',
  },
});
