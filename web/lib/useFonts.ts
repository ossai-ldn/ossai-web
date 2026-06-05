import { useFonts } from 'expo-font';

export function useOssaiFonts() {
  const [loaded, error] = useFonts({
    Brique: require('../assets/fonts/Brique-Regular.otf'),
  });

  return { fontsLoaded: loaded, fontError: error };
}
