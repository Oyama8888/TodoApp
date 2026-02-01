// firebaseConfig.ts
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
// 以下の行に @ts-ignore を追加してエラーを強制的に消します
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    // @ts-ignore
    getReactNativePersistence,
    initializeAuth,
    type Auth
} from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app: FirebaseApp = initializeApp(firebaseConfig);

// 認証状態を永続化（アプリを閉じてもログインを維持）するための設定
export const auth: Auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db: Firestore = getFirestore(app);