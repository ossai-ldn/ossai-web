import { Image, type ImageStyle, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';
import { fonts } from '../lib/fonts';

type Variant = 'wordmark' | 'symbol' | 'text';

type Props = {
  size?: 'sm' | 'md' | 'lg' | 'splash';
  variant?: Variant;
  style?: ViewStyle;
  /** Use Brique font text instead of image (e.g. when font is preloaded). */
  preferText?: boolean;
};

const IMAGE_SIZES = {
  sm: { width: 72, height: 22 },
  md: { width: 96, height: 28 },
  lg: { width: 140, height: 40 },
  splash: { width: 280, height: 80 },
};

const TEXT_SIZES: Record<NonNullable<Props['size']>, TextStyle> = {
  sm: { fontSize: 20, letterSpacing: 5 },
  md: { fontSize: 26, letterSpacing: 7 },
  lg: { fontSize: 36, letterSpacing: 10 },
  splash: { fontSize: 56, letterSpacing: 14 },
};

/** Brand logo — OSSAI wordmark in Brique. */
export default function OssaiLogo({
  size = 'md',
  variant = 'wordmark',
  style,
  preferText = false,
}: Props) {
  if (variant === 'symbol') {
    return (
      <Image
        source={require('../assets/images/base_opt_white.png')}
        style={[IMAGE_SIZES[size] as ImageStyle, style as ImageStyle]}
        resizeMode="contain"
        accessibilityLabel="Ossai"
      />
    );
  }

  if (variant === 'text' || preferText) {
    return (
      <Text
        style={[styles.textLogo, TEXT_SIZES[size], style as TextStyle]}
        accessibilityRole="header"
      >
        OSSAI
      </Text>
    );
  }

  return (
    <View style={[styles.wrap, style]} accessibilityRole="image" accessibilityLabel="Ossai">
      <Image
        source={require('../assets/images/name_logo_white.png')}
        style={[styles.wordmark, IMAGE_SIZES[size] as ImageStyle]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    maxWidth: '100%',
  },
  textLogo: {
    fontFamily: fonts.brique,
    color: '#fff',
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
});
