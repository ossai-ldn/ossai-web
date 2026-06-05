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
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyAGIrOp8gRnWkkSJE824DIrSxoHBcGcqpU',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'ossai-82889.firebaseapp.com',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'ossai-82889',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'ossai-82889.firebasestorage.app',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '1005844037623',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '1:1005844037623:web:4fbf8825c50a00043f78f2',
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? 'G-3MGWGTX7YL',
};

export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);
