import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Vite env vars prefixed with VITE_
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // optional: only used if analytics is initialized
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
} as const;

if (!firebaseConfig.apiKey) {
  // eslint-disable-next-line no-console
  console.warn('[firebase] Missing Firebase env configuration');
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
export const firebaseDb = getFirestore(app);
export const firebaseStorage = getStorage(app);

// Optional: initialize Analytics lazily when supported and enabled
export async function initAnalytics() {
  if (typeof window === 'undefined') return null;
  if (!import.meta.env.PROD) return null;
  if (!firebaseConfig.measurementId) return null;
  try {
    const { isSupported, getAnalytics } = await import('firebase/analytics');
    if (await isSupported()) {
      return getAnalytics(app);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[firebase] Analytics not supported', e);
  }
  return null;
}
