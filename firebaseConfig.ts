// firebaseConfig.ts

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCmDCZr-2AqldtPMDRvm6C-3wLDQxkgmj0", // ご自身のキーに置き換えてください
    authDomain: "todo-7b49e.firebaseapp.com",
    projectId: "todo-7b49e",
    storageBucket: "todo-7b49e.appspot.com",
    messagingSenderId: "374757567544",
    appId: "1:374757567544:web:29351fd072f99920fc0acd",
    measurementId: "G-CK7C3FBFE6"
};

// Firebaseアプリの初期化
const app: FirebaseApp = initializeApp(firebaseConfig);

// Firestoreの初期化
export const db: Firestore = getFirestore(app);

// ★ Firebase Authentication の初期化 (シンプルな形)
//export const auth: Auth = initializeAuth(app, {
  // ここでは永続化に関する複雑な設定は一旦記述しません。
  // これで、React Native環境ではデフォルトでメモリ内永続性（アプリ起動中のみ）となります。
//});