// 例: app/register-username.tsx または screens/RegisterUsernameScreen.tsx などに配置
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router'; // Expo Routerを使用している場合、画面遷移に利用
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../firebaseConfig'; // ご自身のfirebaseConfig.tsへのパスに修正してください

// AsyncStorageに保存する際のキー (他のファイルでも使う場合は共通の場所に定義すると良い)
const CURRENT_USERNAME_KEY = 'currentAppUsername';

const RegisterUsernameScreen = () => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRegisterUsername = async () => {
    setError(null);
    setSuccessMessage(null);
    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3) {
      setError('ユーザーネームは3文字以上で入力してください。');
      return;
    }
    if (trimmedUsername.length > 20) {
      setError('ユーザーネームは20文字以内で入力してください。');
      return;
    }
    // 簡単な文字種チェック (例: 英数字のみ) - 必要に応じて調整
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setError('ユーザーネームは英数字とアンダースコア(_)のみ使用できます。');
      return;
    }


    setLoading(true);

    try {
      // 1. ユーザーネームの重複チェック
      const usersCollectionRef = collection(db, 'users'); // 'users' コレクション
      const q = query(usersCollectionRef, where('username', '==', trimmedUsername));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setError('このユーザーネームは既に使用されています。別の名前を入力してください。');
        setLoading(false);
        return;
      }

      // 2. ユーザーネームをFirestoreに登録
      await addDoc(usersCollectionRef, {
        username: trimmedUsername,
        createdAt: serverTimestamp(),
      });

      // 3. 登録成功後、AsyncStorageにユーザーネームを保存
      await AsyncStorage.setItem(CURRENT_USERNAME_KEY, trimmedUsername);

      setSuccessMessage(`ユーザーネーム「${trimmedUsername}」を登録しました！`);
      setUsername(''); // 入力欄をクリア
      // 登録後はタブ画面などに遷移することを推奨
      // Alert.alert('登録完了', `「${trimmedUsername}」としてアプリを開始します。`, [
      //   { text: 'OK', onPress: () => router.replace('/(tabs)/') } // Expo Routerの場合
      // ]);

    } catch (e) {
      console.error("ユーザーネーム登録エラー: ", e);
      setError('ユーザーネームの登録中にエラーが発生しました。しばらくしてからもう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ユーザーネームを登録</Text>
      <Text style={styles.subtitle}>アプリで使用するユーザーネームを設定してください。</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}
      {successMessage && <Text style={styles.successText}>{successMessage}</Text>}

      <TextInput
        style={styles.input}
        placeholder="希望のユーザーネーム (3〜20文字)"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        maxLength={20}
        editable={!loading}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={{ marginVertical: 20 }}/>
      ) : (
        <TouchableOpacity
          style={[styles.button, (username.trim().length < 3 || loading) && styles.buttonDisabled]}
          onPress={handleRegisterUsername}
          disabled={username.trim().length < 3 || loading}
        >
          <Text style={styles.buttonText}>登録する</Text>
        </TouchableOpacity>
      )}

      {successMessage && (
         <TouchableOpacity
          style={[styles.button, styles.buttonSecondary, {marginTop: 10}]}
          onPress={() => router.replace('/(tabs)')} // Expo Routerでタブのルートに遷移
        >
          <Text style={styles.buttonTextSecondary}>アプリを始める</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  input: {
    height: 50,
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a0cfff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    backgroundColor: '#6c757d',
  },
  buttonTextSecondary: {
     color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#dc3545',
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 14,
  },
  successText: {
    color: '#28a745',
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default RegisterUsernameScreen;