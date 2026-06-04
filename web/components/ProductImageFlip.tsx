import { useState } from 'react';
import { Image, Platform, StyleSheet, View, type ViewStyle } from 'react-native';

type Props = {
  frontUri: string;
  backUri: string;
  style?: ViewStyle;
  soldOut?: boolean;
};

export function ProductImageFlip({ frontUri, backUri, style, soldOut }: Props) {
  const [hovered, setHovered] = useState(false);
  const showBack = Boolean(backUri) && (hovered || (Platform.OS !== 'web' && false));

  const webHoverProps =
    Platform.OS === 'web'
      ? ({
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        } as Record<string, unknown>)
      : {};

  return (
    <View
      style={[styles.wrap, style, soldOut && styles.soldOutDim]}
      {...webHoverProps}
    >
      {frontUri ? (
        <Image
          source={{ uri: frontUri }}
          style={[styles.image, showBack && styles.hidden]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.placeholder]} />
      )}
      {backUri ? (
        <Image
          source={{ uri: backUri }}
          style={[styles.image, styles.backLayer, !showBack && styles.hidden]}
          resizeMode="cover"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#1c1c1e',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  backLayer: {
    zIndex: 2,
  },
  hidden: {
    opacity: 0,
  },
  placeholder: {
    backgroundColor: '#2c2c2e',
    position: 'relative',
  },
  soldOutDim: {
    opacity: 0.55,
  },
});
