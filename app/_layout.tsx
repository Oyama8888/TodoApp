import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react'; // Reactをインポート
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // useEffect(() => { // フォント読み込み完了後に何か処理をする場合はuseEffectを使う
  //   if (loaded) {
  //     SplashScreen.hideAsync(); // 例: スプラッシュスクリーンを隠す
  //   }
  // }, [loaded]);

  if (!loaded) {
    // Async font loading aonly occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* 認証関連の画面グループ */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        {/* タブベースのメイン画面グループ */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Not Found画面 */}
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}