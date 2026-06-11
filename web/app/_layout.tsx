import { BlurView } from 'expo-blur';
import { Slot, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import OssaiLogo from '../components/OssaiLogo';
import SiteHeader from '../components/SiteHeader';
import { useOssaiFonts } from '../lib/useFonts';

export default function RootLayout() {
    useOssaiFonts();
    const pathname = usePathname();
    const isHome = pathname === '/' || pathname === '';
    const [isOverlayVisible, setIsOverlayVisible] = useState(true);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const animation = Animated.sequence([
            Animated.delay(2000),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false,
            }),
        ]);

        animation.start(({ finished }) => {
            if (finished) {
                setIsOverlayVisible(false);
            }
        });

        return () => animation.stop();
    }, [fadeAnim]);

    return (
        <View style={{ flex: 1 }}>
            {!isHome && <SiteHeader />}
            <Slot />

            {isOverlayVisible && (
                <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                    <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark">
                        <View style={styles.centered}>
                            <OssaiLogo size="splash" preferText />
                        </View>
                    </BlurView>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
