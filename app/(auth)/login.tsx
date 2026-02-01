import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../../firebaseConfig';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  // ログイン処理
  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/(tabs)'); 
    } catch (error: any) {
      Alert.alert('ログイン失敗', 'メールアドレスかパスワードが正しくありません');
    }
  };

  // 新規登録処理
  const handleSignUp = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      Alert.alert('成功', 'アカウントを作成しました！');
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('登録失敗', '正しい情報を入力してください');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ToDoアプリへようこそ</Text>
      <TextInput 
        style={styles.input} 
        placeholder="メールアドレス" 
        value={email} 
        onChangeText={setEmail} 
        autoCapitalize="none" 
      />
      <TextInput 
        style={styles.input} 
        placeholder="パスワード" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>ログイン</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleSignUp} style={{ marginTop: 20 }}>
        <Text style={styles.linkText}>新規登録はこちら</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#F5F5F5' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 40, color: '#333' },
  input: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 15, padding: 15, fontSize: 16 },
  button: { backgroundColor: '#2196F3', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  linkText: { textAlign: 'center', color: '#2196F3', fontSize: 14 }
});