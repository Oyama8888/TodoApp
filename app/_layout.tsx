import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router'; // useRouter, useSegmentsを追加
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, User } from 'firebase/auth'; // Firebase Authをインポート
import React, { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { auth } from '../firebaseConfig'; // 修正したconfigをインポート

import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [user, setUser] = useState<User | null>(null); // ログイン状態を保持
  const [initializing, setInitializing] = useState(true); // 初期化中かどうかのフラグ
  const router = useRouter();
  const segments = useSegments(); // 現在の画面の場所を特定

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // ログイン状態を監視する
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (initializing) setInitializing(false);
    });
    return unsubscribe; // クリーンアップ
  }, []);

  // ログイン状態に応じて画面を自動で切り替える
  useEffect(() => {
    if (initializing || !loaded) return;

    // 現在(auth)グループにいるかどうか
    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // ログインしていない ＆ ログイン画面以外にいるなら、ログイン画面へ
      router.replace('//login');
    } else if (user && inAuthGroup) {
      // ログインしている ＆ ログイン画面にいるなら、メイン画面へ
      router.replace('/(tabs)');
    }
  }, [user, initializing, loaded, segments]);

  if (!loaded || initializing) {
    return null; // ロード中は何も表示しない（またはスプラッシュ画面）
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* 認証画面 */}
        <Stack.Screen name="(auth)/login" options={{ title: 'ログイン', headerShown: false }} />
        {/* メインのタブ画面 */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* その他 */}
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}