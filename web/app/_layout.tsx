import { BlurView } from 'expo-blur';
import { Slot, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import SiteHeader from '../components/SiteHeader';

export default function RootLayout() {
    const pathname = usePathname();
    const isHome = pathname === '/' || pathname === '';
    const [isOverlayVisible, setIsOverlayVisible] = useState(true);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // 3. Start your custom fade-out animation
        const animation = Animated.sequence([
            Animated.delay(2000), // Keep overlay visible for 2 seconds
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false, // Note: On web, useNativeDriver doesn't matter much, but good practice
            }),
        ]);

        animation.start(({ finished }) => {
            if (finished) {
                setIsOverlayVisible(false); // Unmount when done
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
                    {/* High intensity blur for the frosted effect */}
                    <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark">
                        <View style={styles.centered}>
                            <Image
                                source={require('../assets/images/name_logo_white.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
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
        zIndex: 100, // Make sure this is high enough to sit on top
        backgroundColor: 'rgba(0,0,0,0.3)', // Slight dark tint base
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: '80%',
    }
});
