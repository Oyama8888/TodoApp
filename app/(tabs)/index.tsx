import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Firebase関連のインポート
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  userId: string;
}

export default function TodoScreen() {
  const [task, setTask] = useState('');
  const [description, setDescription] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    // Firestoreからデータを取得
    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData: Task[] = [];
      querySnapshot.forEach((doc) => {
        tasksData.push({ id: doc.id, ...doc.data() } as Task);
      });
      setTasks(tasksData);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addTask = async () => {
    if (task.trim() === '' || !user) {
      Alert.alert('エラー', 'タスクを入力してください');
      return;
    }

    try {
      await addDoc(collection(db, 'tasks'), {
        title: task,
        description: description.trim(),
        completed: false,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      setTask('');
      setDescription('');
      Keyboard.dismiss();
    } catch (error) {
      Alert.alert('エラー', 'タスクの保存に失敗しました');
    }
  };

  const toggleTaskCompletion = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'tasks', id), {
        completed: !currentStatus
      });
    } catch (error) {
      Alert.alert('エラー', '更新に失敗しました');
    }
  };

  const deleteTask = (id: string) => {
    Alert.alert('確認', 'このタスクを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => {
        try {
          await deleteDoc(doc(db, 'tasks', id));
        } catch (error) {
          Alert.alert('エラー', '削除に失敗しました');
        }
      }},
    ]);
  };

  if (loading) {
    return <View style={styles.loadingContainer}><Text>読み込み中...</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['right', 'left']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <FlatList
          data={tasks}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.taskContainer}>
              <TouchableOpacity
                style={styles.taskTextContainer}
                onPress={() => { setSelectedTask(item); setModalVisible(true); }}
              >
                <Ionicons
                  name={item.completed ? 'checkbox-outline' : 'square-outline'}
                  size={24}
                  color={item.completed ? '#4CAF50' : '#757575'}
                  style={styles.checkbox}
                  onPress={() => toggleTaskCompletion(item.id, item.completed)}
                />
                <Text style={[styles.taskTitle, item.completed && styles.completedTask]}>
                  {item.title}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => deleteTask(item.id)}>
                <Ionicons name="trash-outline" size={24} color="#FF5252" />
              </TouchableOpacity>
            </View>
          )}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />

        <View style={styles.inputContainer}>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              placeholder="新しいタスクを入力..."
              value={task}
              onChangeText={setTask}
            />
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="詳細（任意）"
              value={description}
              onChangeText={setDescription}
            />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={addTask}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 詳細表示モーダル */}
      {selectedTask && (
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedTask.title}</Text>
              <Text style={styles.modalDescription}>
                {selectedTask.description || '（詳細はありません）'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>閉じる</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ここが不足していた「styles」の定義です
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  keyboardView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 160 },
  taskContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  taskTextContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  checkbox: { marginRight: 10 },
  taskTitle: { fontSize: 16, flex: 1 },
  completedTask: { textDecorationLine: 'line-through', color: '#9E9E9E' },
  deleteButton: { padding: 4 },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  input: {
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  addButton: {
    width: 50,
    height: 108,
    backgroundColor: '#2196F3',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  modalDescription: { fontSize: 16, color: '#555', marginBottom: 20 },
  modalCloseButton: { backgroundColor: '#2196F3', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  modalCloseText: { color: '#fff', fontWeight: 'bold' },
});