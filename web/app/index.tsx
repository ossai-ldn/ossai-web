import { BlurView } from 'expo-blur';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import AnnouncementBar from '../components/AnnouncementBar';
import OssaiLogo from '../components/OssaiLogo';
import PasswordGateControls from '../components/PasswordGateControls';
import SiteFooter from '../components/SiteFooter';
import { setStoredSignupId } from '../lib/accessSession';
import { classifyContact } from '../lib/classifyContact';
import { registerSignup } from '../lib/callables';
import { setStoredDiscountCode } from '../lib/cartContext';
import { useSite } from '../lib/siteContext';
import { Link } from 'expo-router';

const HEADER_HEIGHT = 110;
const ERROR_RESET_DELAY_MS = 2000;
const SUCCESS_RESET_DELAY_MS = 3000;
type Status = 'idle' | 'loading' | 'success' | 'error';

export default function Index() {
    const { config } = useSite();
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<Status>('idle');
    const [discountPreview, setDiscountPreview] = useState('');
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const clearTimers = () => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    };
    const scheduleTimer = (callback: () => void, delay: number) => {
        const timeoutId = setTimeout(() => {
            timersRef.current = timersRef.current.filter((id) => id !== timeoutId);
            callback();
        }, delay);

        timersRef.current.push(timeoutId);
    };

    useEffect(() => {
        return () => {
            timersRef.current.forEach(clearTimeout);
            timersRef.current = [];
        };
    }, []);

    // 2. LOGIC HANDLERS
    const handleJoin = async () => {
        if (status === 'loading') return;

        clearTimers();

        // Accept either an email address or a phone number in the single field.
        const contact = classifyContact(email);
        if (!contact) {
            setStatus('error');
            scheduleTimer(() => setStatus('idle'), ERROR_RESET_DELAY_MS);
            return;
        }

        setStatus('loading');

        try {
            const result = await registerSignup({
                contact: contact.value,
                source: 'web-landing',
                userAgent:
                    Platform.OS === 'web' && typeof navigator !== 'undefined'
                        ? navigator.userAgent
                        : Platform.OS,
            });
            setStoredSignupId(result.signupId);
            if (result.discountCode) setStoredDiscountCode(result.discountCode);
            setDiscountPreview(
                result.discountCode
                    ? `${result.discountCode} · ${result.discountPercent}% off`
                    : '',
            );

            setStatus('success');
            setEmail('');
            scheduleTimer(() => {
                setStatus('idle');
                setDiscountPreview('');
            }, SUCCESS_RESET_DELAY_MS);
        } catch (err) {
            console.error('Signup failed', err);
            setStatus('error');
            scheduleTimer(() => setStatus('idle'), ERROR_RESET_DELAY_MS);
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'success': return '#aaffbfff'; // Green
            case 'error': return '#ff918bff';   // Red
            case 'loading': return '#666666'; // Grey (for spinner)
            default: return '#FFFFFF';        // White
        }
    };

    const webStyle = `
    input:-webkit-autofill,
    input:-webkit-autofill:hover, 
    input:-webkit-autofill:focus, 
    input:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 30px #1C1C1E inset !important;
        -webkit-text-fill-color: white !important;
        transition: background-color 5000s ease-in-out 0s;
    }
  `;

    const [isFocused, setIsFocused] = useState(false);

    // 4. THE UI
    return (
        <View style={styles.container}>
            {Platform.OS === 'web' && (
                <style type="text/css">{webStyle}</style>
            )}

            <Image
                source={require('../assets/images/base_opt_white.png')}
                style={styles.backgroundImage}
                resizeMode="contain" // Keeps aspect ratio based on huge dimensions below
            />

            {/* --- LAYER 1: Scrollable Content --- */}
            <ScrollView
                contentContainerStyle={{
                    paddingTop: HEADER_HEIGHT + 52,
                    paddingBottom: 40,
                    paddingHorizontal: 20,
                    flexGrow: 1, // Use flexGrow instead of flex: 1 for ScrollViews
                    alignItems: 'center',
                }}
                indicatorStyle="white"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.heroTag}>SS26 — PERSEVERANCE</Text>
                <Text style={styles.heroTitle}>PRIVATE EXHIBITION</Text>
                <Text style={styles.heroSub}>Contemporary form for those who wait.</Text>

                {config.featuredCollectionHandle ? (
                    <Link href={`/shop/collections/${config.featuredCollectionHandle}` as never} asChild>
                        <TouchableOpacity style={styles.ctaBanner} activeOpacity={0.85}>
                            <Text style={styles.ctaText}>VIEW CURRENT DROP →</Text>
                        </TouchableOpacity>
                    </Link>
                ) : null}

                {/* --- NEWSLETTER SECTION --- */}
                <View style={styles.newsletterCard}>
                    <Text style={styles.newsletterTitle}>NEWSLETTER</Text>
                    <Text style={styles.newsletterSub}>
                        {config.newsletterPromoText || 'Sign up for events and drops'}
                    </Text>

                    {/* Container for Input and Button (Now Stacked) */}
                    <View style={styles.formContainer}>
                        <TextInput
                            style={[
                                styles.input,
                                status === 'error' && { borderWidth: 1, borderColor: '#FF3B30' }
                            ]}
                            // 2. Logic to hide placeholder on focus
                            placeholder={isFocused ? '' : "Enter your email or number"}
                            placeholderTextColor="#666"

                            // 3. Add these two handlers
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}

                            // ... keep existing props
                            keyboardType="default"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                if (status === 'error') {
                                    clearTimers();
                                    setStatus('idle');
                                }
                            }}
                        />

                        {/* DYNAMIC ENTER BUTTON */}
                        {/* DYNAMIC TEXT BUTTON */}
                        <TouchableOpacity
                            style={styles.textButton}
                            onPress={handleJoin}
                            activeOpacity={0.7}
                            disabled={status === 'loading' || status === 'success'}
                        >
                            {status === 'loading' ? (
                                <ActivityIndicator color={getStatusColor()} />
                            ) : (
                                <Text style={[styles.textButtonLabel, { color: getStatusColor() }]}>
                                    {status === 'success' ? 'Sent' : status === 'error' ? 'Retry' : 'Enter'}
                                </Text>
                            )}
                        </TouchableOpacity>
                        {status === 'success' && discountPreview ? (
                            <Text style={styles.discountHint}>{discountPreview}</Text>
                        ) : null}
                    </View>
                </View>

                <SiteFooter />
            </ScrollView>

            <View style={styles.announcementWrap}>
                <AnnouncementBar />
            </View>
            <BlurView intensity={30} tint="dark" style={styles.header}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.passwordTopRight}>
                        <PasswordGateControls navigateOnUnlock />
                    </View>
                    <View style={styles.headerContent}>
                        <OssaiLogo size="md" preferText />
                    </View>
                </SafeAreaView>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        // IMPORTANT FOR WEB: This clips the overflowing image 
        // so it doesn't cause browser scrollbars.
        overflow: 'hidden',
    },

    // --- NEW BACKGROUND STYLE ---
    backgroundImage: {
        position: 'absolute',

        // 1. INCREASE SIZE (Keep these equal to maintain aspect ratio)
        width: 800,
        height: 800,

        // 2. ADJUST HORIZONTAL POSITION
        // Set this to exactly negative half of the width (-600)
        right: -400,

        // 3. ADJUST VERTICAL POSITION (Optional)
        // To center it vertically relative to the screen:
        top: '50%',
        marginTop: -400, // Set this to negative half of the height

        // Visuals
        opacity: 0.12,
        pointerEvents: 'none',
    },
    announcementWrap: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 101,
    },
    header: {
        position: 'absolute',
        top: 32,
        left: 0,
        right: 0,
        height: HEADER_HEIGHT,
        zIndex: 100,
        overflow: 'hidden',
    },
    heroTag: {
        color: '#8e8e93',
        fontSize: 10,
        letterSpacing: 5,
        textAlign: 'center',
        marginBottom: 8,
        marginTop: 12,
    },
    heroTitle: {
        color: '#fff',
        fontSize: 28,
        letterSpacing: 8,
        textAlign: 'center',
        fontWeight: '300',
        marginBottom: 8,
    },
    heroSub: {
        color: '#8e8e93',
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 24,
    },
    ctaBanner: {
        borderWidth: 1,
        borderColor: '#fff',
        paddingVertical: 14,
        paddingHorizontal: 28,
        marginBottom: 32,
    },
    ctaText: {
        color: '#fff',
        fontSize: 11,
        letterSpacing: 3,
    },
    safeArea: {
        flex: 1,
    },
    passwordTopRight: {
        position: 'absolute',
        top: 0,
        right: 0,
        zIndex: 2,
        paddingTop: 4,
        paddingRight: 12,
        alignItems: 'flex-end',
    },
    headerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heading: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 20,
        color: '#FFFFFF',
        marginTop: 40, // Push title down a bit visually
    },
    // Newsletter Styles
    newsletterCard: {
        width: '100%',
        marginTop: 20,
        paddingVertical: 30, // More vertical padding for breathing room
        paddingHorizontal: 20,
        borderRadius: 16,
        alignItems: 'center', // <--- Centers the Title and Subtitle
    },

    newsletterTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        textAlign: 'center',
    },

    newsletterSub: {
        color: '#888',
        marginBottom: 20,
        textAlign: 'center',
    },
    discountHint: {
        color: '#aaffbf',
        fontSize: 12,
        letterSpacing: 1,
        textAlign: 'center',
        marginTop: 8,
    },

    formContainer: {
        width: '100%',
        alignItems: 'center', // <--- Centers the Input and Button horizontally
        gap: 12,
    },

    input: {
        width: '90%',        // <--- Uses 90% width so it looks centered/framed
        maxWidth: 400,       // <--- Prevents it from getting too wide on tablets/web
        height: 50,
        backgroundColor: '#1C1C1E',
        opacity: 0.8,
        borderRadius: 12,
        paddingHorizontal: 15,
        color: 'white',
        textAlign: 'center', // <--- Optional: Centers the text *inside* the input
        borderWidth: 0,
    },

    textButton: {
        marginTop: 10,       // distinct space from the input
        paddingVertical: 10, // Good touch target size
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // The actual text style
    textButtonLabel: {
        fontSize: 16,
        fontWeight: '600', // Semi-bold looks better for text buttons
        letterSpacing: 0.5,
        textTransform: 'uppercase', // Optional: makes it look more like a "control"
    },

    // Footer
    footer: {
        marginTop: 'auto',
        alignItems: 'center',
        paddingVertical: 20,
        width: '100%',
    },
    divider: {
        width: 40,
        height: 1,
        backgroundColor: '#646363ff',
        marginBottom: 20,
    },
    copyright: {
        color: '#797979ff',
        fontSize: 12,
    },
});
