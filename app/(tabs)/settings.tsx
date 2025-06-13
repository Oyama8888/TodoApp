// app/(tabs)/settings.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router'; // ★ Expo Router をインポート
import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'; // ActivityIndicator を追加
import { db } from '../../firebaseConfig'; // firebaseConfig.ts のパスを確認

const CURRENT_USERNAME_KEY = 'currentAppUsername';

export default function SettingsScreen() {
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false); // ユーザー名変更時のローディング
  const [isScreenLoading, setIsScreenLoading] = useState(true); // 初回読み込み時のローディング

  useEffect(() => {
    const loadUsername = async () => {
      setIsScreenLoading(true);
      try {
        const storedUsername = await AsyncStorage.getItem(CURRENT_USERNAME_KEY);
        setCurrentUsername(storedUsername);
        if (storedUsername) {
          setNewUsername(storedUsername); // 初期値をセット
        }
      } catch (e) {
        console.error("AsyncStorageからの読み込みエラー:", e);
        // エラーハンドリング (例: Alert.alertなど)
      } finally {
        setIsScreenLoading(false);
      }
    };
    loadUsername();
  }, []);

  const handleChangeUsername = async () => {
    const trimmedNewUsername = newUsername.trim();
    if (!trimmedNewUsername || trimmedNewUsername.length < 3) {
      Alert.alert('エラー', '新しいユーザーネームは3文字以上で入力してください。');
      return;
    }
    if (trimmedNewUsername === currentUsername) {
      Alert.alert('情報', 'ユーザーネームに変更はありません。');
      return;
    }
    // 簡単な文字種チェック (例: 英数字のみ) - RegisterUsernameScreenと合わせる
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedNewUsername)) {
      Alert.alert('エラー', 'ユーザーネームは英数字とアンダースコア(_)のみ使用できます。');
      return;
    }


    setIsLoading(true);
    try {
      const usersCollectionRef = collection(db, 'users');
      const q = query(usersCollectionRef, where('username', '==', trimmedNewUsername));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        Alert.alert('エラー', 'このユーザーネームは既に使用されています。');
        setIsLoading(false);
        return;
      }

      if (currentUsername) {
        const oldUserQuery = query(usersCollectionRef, where('username', '==', currentUsername));
        const oldUserSnap = await getDocs(oldUserQuery);

        if (oldUserSnap.empty) {
          Alert.alert('エラー', '現在のユーザー情報が見つかりませんでした。再登録をお試しください。');
          // AsyncStorageをクリアして登録画面へ促すなどの処理も検討
          await AsyncStorage.removeItem(CURRENT_USERNAME_KEY);
          setCurrentUsername(null); 
          setNewUsername('');
          setIsLoading(false);
          return;
        }

        const batch = writeBatch(db);
        oldUserSnap.forEach(document => {
          batch.update(doc(db, 'users', document.id), { username: trimmedNewUsername });
        });
        // TODO: チームのmembers配列内の古いユーザーネームも更新する必要がある (非常に複雑)
        // このTODOは、ユーザーIDベースのシステムに移行するまで現実的でないかもしれません。

        await batch.commit();
      } else {
        Alert.alert('エラー', '現在のユーザー名が不明なため変更できません。');
        setIsLoading(false);
        return;
      }
      
      await AsyncStorage.setItem(CURRENT_USERNAME_KEY, trimmedNewUsername);
      setCurrentUsername(trimmedNewUsername); // ローカルステートも更新
      Alert.alert('成功', 'ユーザーネームを変更しました。');

    } catch (error) {
      console.error("ユーザーネーム変更エラー: ", error);
      Alert.alert('エラー', 'ユーザーネームの変更に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  if (isScreenLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (currentUsername === null) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.infoText}>ユーザーネームが登録されていません。</Text>
        <Text style={styles.infoText}>まずユーザーネームを登録してください。</Text>
        <TouchableOpacity
          style={[styles.navigationButton, { marginTop: 20 }]}
          onPress={() => router.push('/RegisterUsernameScreen')} // RegisterUsernameScreenへのパス
        >
          <Text style={styles.navigationButtonText}>ユーザーネーム登録画面へ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ユーザー設定</Text>
      <View style={styles.card}>
        <Text style={styles.label}>現在のユーザーネーム:</Text>
        <Text style={styles.usernameDisplay}>{currentUsername}</Text>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.label}>新しいユーザーネームに変更:</Text>
        <TextInput
          style={styles.input}
          value={newUsername}
          onChangeText={setNewUsername}
          placeholder="新しいユーザーネーム (3文字以上)"
          autoCapitalize="none"
          maxLength={20}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.actionButton, (isLoading || !newUsername || newUsername === currentUsername || newUsername.length < 3) && styles.actionButtonDisabled]}
          onPress={handleChangeUsername}
          disabled={isLoading || !newUsername || newUsername === currentUsername || newUsername.length < 3}
        >
          <Text style={styles.actionButtonText}>{isLoading ? "変更処理中..." : "ユーザーネームを変更"}</Text>
        </TouchableOpacity>
      </View>
      {/* 将来的にはここにプロフィール写真設定UIなどを追加 */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f2f5', // 少し背景色を変更
  },
  centered: { // 中央揃え用のスタイル
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    color: '#495057', // 少し濃いめのグレー
    marginBottom: 8,
  },
  usernameDisplay: { // 表示専用のユーザースタイル
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff', // プライマリカラー
    paddingVertical: 10,
  },
  input: {
    height: 50,
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  infoText: {
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 10,
    color: '#6c757d', // やや薄いグレー
  },
  navigationButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: 'center',
  },
  navigationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButton: {
    backgroundColor: '#28a745', // 緑系のボタン
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#a3d9b1', // 少し薄い緑
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});