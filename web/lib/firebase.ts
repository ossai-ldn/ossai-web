import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Firebase web configuration.
 *
 * These values are public client identifiers (not secrets) and are safe to ship
 * in the static bundle — access is controlled by Firestore Security Rules, not by
 * hiding this config. Values can be overridden at build time via EXPO_PUBLIC_*
 * environment variables.
 */
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyDM5RGJLQZh_fTjj-aGA-MLfNFJqGiQlAU',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'ossai-9c5e2.firebaseapp.com',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'ossai-9c5e2',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'ossai-9c5e2.firebasestorage.app',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '409365862293',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '1:409365862293:web:d8e214f36c77819533c89c',
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? 'G-JJEEX2F834',
};

export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);
