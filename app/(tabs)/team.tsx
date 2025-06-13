// app/(tabs)/team.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard'; // クリップボード機能のため
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../../firebaseConfig'; // パスが正しいか確認してください

const CURRENT_USERNAME_KEY = 'currentAppUsername';

type Team = {
  id: string;
  name: string;
};

type Task = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  teamId?: string; 
  createdAt?: any; // serverTimestampのため
};

export default function TeamScreen() {
  const [teamName, setTeamName] = useState('');
  const [joinTeamId, setJoinTeamId] = useState('');
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');

  const [currentAppUsername, setCurrentAppUsername] = useState<string | null>(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [isScreenLoading, setIsScreenLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  const [viewMode, setViewMode] = useState<'tasks' | 'members'>('tasks'); // ★ 表示モード管理 ('tasks' or 'members')

  useEffect(() => {
    const loadInitialData = async () => {
      setIsScreenLoading(true);
      const username = await AsyncStorage.getItem(CURRENT_USERNAME_KEY);
      setCurrentAppUsername(username);
      if (username) {
        await fetchUserTeams(username);
      }
      setIsScreenLoading(false);
    };
    loadInitialData();
  }, []);

  const fetchUserTeams = async (username: string) => {
    if (!username) return;
    try {
      const teamsCollectionRef = collection(db, 'teams');
      const q = query(teamsCollectionRef, where('members', 'array-contains', username));
      const querySnapshot = await getDocs(q);
      const userTeams = querySnapshot.docs.map(d => ({
        id: d.id,
        name: d.data().name,
      })) as Team[];
      setMyTeams(userTeams);
    } catch (error) {
      console.error("自分のチーム取得エラー: ", error);
      Alert.alert('エラー', '参加チームの取得に失敗しました。');
    }
  };

  const createTeam = async () => {
    if (!teamName.trim() || !currentAppUsername) {
      Alert.alert('エラー', 'チーム名を入力し、ユーザー名が設定されている必要があります。');
      return;
    }
    try {
      const newTeamRef = await addDoc(collection(db, 'teams'), {
        name: teamName.trim(),
        members: [currentAppUsername],
        createdAt: serverTimestamp(),
      });
      await fetchUserTeams(currentAppUsername);
      setTeamName('');
      Alert.alert(
        'チーム作成完了',
        `チーム名: ${teamName.trim()}\nチームID: ${newTeamRef.id}\n\nこのIDをメンバーに伝えましょう。`,
        [{ text: 'OK', onPress: async () => {
            await Clipboard.setStringAsync(newTeamRef.id);
            Alert.alert('コピー完了', 'チームIDをクリップボードにコピーしました。');
        }}]
      );
      setIsModalVisible(false);
    } catch (error) {
      Alert.alert('エラー', 'チームの作成に失敗しました。');
    }
  };

  const joinTeam = async () => {
    const idToJoin = joinTeamId.trim();
    if (!idToJoin || !currentAppUsername) {
      Alert.alert('エラー', 'チームIDを入力し、ユーザー名が設定されている必要があります。');
      return;
    }
    try {
      const teamRef = doc(db, 'teams', idToJoin);
      const teamSnap = await getDoc(teamRef);

      if (teamSnap.exists()) {
        const teamData = teamSnap.data();
        if (teamData.members && teamData.members.includes(currentAppUsername)) {
          Alert.alert('情報', `あなたは既にチーム「${teamData.name}」のメンバーです。`);
          setIsModalVisible(false);
          return;
        }
        await updateDoc(teamRef, {
          members: arrayUnion(currentAppUsername)
        });
        await fetchUserTeams(currentAppUsername);
        setJoinTeamId('');
        Alert.alert('チーム参加', `チーム「${teamSnap.data()?.name}」に参加しました。`);
        setIsModalVisible(false);
      } else {
        Alert.alert('エラー', '指定されたチームは存在しません。');
      }
    } catch (error) {
      Alert.alert('エラー', 'チーム参加中に問題が発生しました。');
    }
  };
  
  const fetchTasks = async (teamId: string) => {
    // ... (変更なし)
    const tasksQuery = query(collection(db, 'tasks'), where('teamId', '==', teamId));
    const querySnapshot = await getDocs(tasksQuery);
    const tasksList = querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    })) as Task[];
    setTasks(tasksList);
  };

  const addTask = async () => {
    // ... (変更なし、createdAt追加)
    if (!newTaskTitle.trim() || !currentTeamId) {
      Alert.alert('エラー', 'タスク名を入力し、チームを選択してください。');
      return;
    }
    try {
      await addDoc(collection(db, 'tasks'), {
        teamId: currentTeamId,
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim(),
        completed: false,
        createdAt: serverTimestamp(),
      });
      fetchTasks(currentTeamId); 
      setNewTaskTitle('');
      setNewTaskDescription('');
      Alert.alert('タスク追加完了');
    } catch (error) {
      Alert.alert('エラー', 'タスクの追加に失敗しました。');
    }
  };

  const onSelectTeam = async (teamId: string) => {
    setCurrentTeamId(teamId);
    setSelectedTeamMembers([]); 
    setViewMode('tasks'); // ★ チーム選択時はデフォルトでタスク表示に戻す
    fetchTasks(teamId); 

    try {
      const teamDocRef = doc(db, 'teams', teamId);
      const teamDocSnap = await getDoc(teamDocRef);
      if (teamDocSnap.exists()) {
        const teamData = teamDocSnap.data();
        setSelectedTeamMembers(teamData.members || []); 
      }
    } catch (error) {
      console.error("チームメンバー取得エラー: ", error);
    }
  };

  const toggleTaskCompleted = async (taskId: string, current: boolean) => {
    // ... (変更なし)
    if (!currentTeamId) return;
    await updateDoc(doc(db, 'tasks', taskId), { completed: !current });
    fetchTasks(currentTeamId);
  };

  const deleteTask = async (taskId: string) => {
    // ... (変更なし)
    await deleteDoc(doc(db, 'tasks', taskId));
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };


  if (isScreenLoading) {
    return <View style={styles.centeredContainer}><ActivityIndicator size="large" color="#007bff" /></View>;
  }
  
  if (!currentAppUsername) {
     return (
      <View style={styles.centeredContainer}>
        <Text style={styles.infoText}>ユーザーネームが設定されていません。</Text>
        <Text style={styles.infoText}>まずユーザー設定タブからユーザーネームを登録または確認してください。</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* 所属チーム一覧 */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>参加中のチーム</Text>
          {myTeams.length === 0 ? (
            <Text style={styles.emptyText}>まだチームがありません。「＋」ボタンから作成または参加してください。</Text>
          ) : (
            myTeams.map((team) => {
              const isSelected = team.id === currentTeamId;
              return (
                <TouchableOpacity key={team.id} onPress={() => onSelectTeam(team.id)}>
                  <View style={[styles.teamBox, isSelected && styles.teamBoxSelected]}>
                    <Text style={styles.teamItemText}>{team.name}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ★ 選択中のチームID表示とコピーボタン */}
        {currentTeamId && (
          <View style={styles.selectedTeamInfoContainer}>
            <Text style={styles.selectedTeamIdLabel}>選択中のチームID:</Text>
            <Text style={styles.selectedTeamIdText} selectable>{currentTeamId}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={async () => {
                await Clipboard.setStringAsync(currentTeamId);
                Alert.alert('コピー完了', 'チームIDをクリップボードにコピーしました。');
              }}
            >
              <Ionicons name="copy-outline" size={18} color="#fff" />
              <Text style={styles.copyButtonText}> IDをコピー</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ★ 表示モード切り替えUI */}
        {currentTeamId && (
          <View style={styles.viewModeToggleContainer}>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'tasks' && styles.viewModeButtonActive]}
              onPress={() => setViewMode('tasks')}
            >
              <Text style={[styles.viewModeButtonText, viewMode === 'tasks' && styles.viewModeButtonTextActive]}>タスク</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'members' && styles.viewModeButtonActive]}
              onPress={() => setViewMode('members')}
            >
              <Text style={[styles.viewModeButtonText, viewMode === 'members' && styles.viewModeButtonTextActive]}>メンバー</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ★ メンバー表示 */}
        {currentTeamId && viewMode === 'members' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>チームメンバー</Text>
            {selectedTeamMembers.length > 0 ? (
              selectedTeamMembers.map(memberUsername => (
                <Text key={memberUsername} style={styles.memberItem}>- {memberUsername}</Text>
              ))
            ) : (
              <Text style={styles.emptyText}>メンバー情報がありません。</Text>
            )}
          </View>
        )}

        {/* ★ タスク管理 (タスク表示と追加フォーム) */}
        {currentTeamId && viewMode === 'tasks' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>チームタスク</Text>
            {tasks.length === 0 && <Text style={styles.emptyText}>このチームにはまだタスクがありません。</Text>}
            <FlatList
              data={tasks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.taskItem}>
                  <Text style={[styles.taskTitle, item.completed && styles.taskCompleted]}>
                    {item.title}
                  </Text>
                  {item.description ? <Text style={styles.taskDescription}>{item.description}</Text> : null}
                  <View style={styles.taskActions}>
                    <TouchableOpacity
                      onPress={() => toggleTaskCompleted(item.id, item.completed)}
                      style={[styles.taskButton, item.completed ? styles.taskButtonUndo : styles.taskButtonDone]}
                    >
                      <Text style={styles.taskButtonText}>
                        {item.completed ? '未完了' : '完了'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteTask(item.id)}
                      style={[styles.taskButton, styles.taskButtonDelete]}
                    >
                      <Text style={styles.taskButtonText}>削除</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              // スクロール競合を避けるため、FlatList自体のスクロールを無効化するか、
              // ScrollViewのネストを避ける工夫がより望ましい場合があります。
              // ここではシンプルにそのまま配置しています。
              scrollEnabled={false} // 親のScrollViewでスクロールするため
            />
            
            {/* タスク追加フォーム */}
            <View style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder="新しいタスク名"
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
              />
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="タスク詳細（任意）"
                value={newTaskDescription}
                onChangeText={setNewTaskDescription}
                multiline
              />
              <TouchableOpacity style={styles.buttonPrimary} onPress={addTask}>
                <Text style={styles.buttonText}>タスク追加</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => { setIsModalVisible(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>チームオプション</Text>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>新しいチームを作成</Text>
              <TextInput style={styles.input} placeholder="新しいチーム名" value={teamName} onChangeText={setTeamName} />
              <TouchableOpacity style={styles.buttonPrimary} onPress={createTeam}>
                <Text style={styles.buttonText}>作成する</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.separator}></View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>既存のチームに参加</Text>
              <TextInput style={styles.input} placeholder="参加するチームのID" value={joinTeamId} onChangeText={setJoinTeamId} />
              <TouchableOpacity style={styles.buttonPrimary} onPress={joinTeam}>
                <Text style={styles.buttonText}>参加する</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.buttonSecondary, { marginTop: 20 }]}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.buttonTextSecondary}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    flexGrow: 1,
  },
  infoText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    color: '#555',
  },
  sectionContainer: {
    marginBottom: 20, // 各セクション間のマージンを少し調整
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, // 影を少し薄く
    shadowRadius: 2,
    elevation: 2, // elevationも少し調整
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600', // セミボールド
    marginBottom: 12, // マージン調整
    color: '#343a40',
  },
  emptyText: {
    color: '#6c757d',
    fontStyle: 'italic',
    textAlign: 'center', // 中央揃え
    paddingVertical: 10, // 上下パディング
  },
  teamBox: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6, // マージン調整
    backgroundColor: '#fff',
  },
  teamBoxSelected: {
    borderColor: '#007bff',
    backgroundColor: '#e7f3ff',
    borderWidth: 2, // 選択時ボーダーを少し太く
  },
  teamItemText: {
    fontSize: 16,
    color: '#212529',
    fontWeight: '500', // 少し太く
  },
  // --- チームID表示・コピー ---
  selectedTeamInfoContainer: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedTeamIdLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  selectedTeamIdText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 10,
    paddingHorizontal: 8, // テキスト選択しやすくするため
    paddingVertical: 4,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  copyButton: {
    flexDirection: 'row',
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  // --- 表示モード切り替えボタン ---
  viewModeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20, // 下にマージン追加
    backgroundColor: '#e9ecef', // 背景色
    borderRadius: 20, // 親コンテナも角丸に
    padding: 4, // 内側パディング
  },
  viewModeButton: {
    flex: 1, // ボタンが等幅になるように
    paddingVertical: 10, // 少し高さを出す
    paddingHorizontal: 15, // 横パディング
    borderRadius: 16, // ボタンも角丸に
    marginHorizontal: 0, // 隣接させるためマージン0
    alignItems: 'center', // テキスト中央揃え
  },
  viewModeButtonActive: {
    backgroundColor: '#007bff',
  },
  viewModeButtonText: {
    color: '#007bff',
    fontWeight: '600', // セミボールド
    fontSize: 15,
  },
  viewModeButtonTextActive: {
    color: '#fff',
  },
  // --- メンバー表示 ---
  memberItem: {
    fontSize: 15,
    paddingVertical: 4, // 少しスペースを
    color: '#495057',
    borderBottomWidth: 1, // 区切り線
    borderBottomColor: '#f1f3f5',
  },
  // --- タスク関連 (既存のスタイルを微調整) ---
  taskItem: {
    marginVertical: 8,
    padding: 15, // 少し広めに
    backgroundColor: '#fff', // 背景を白に
    borderRadius: 8,
    borderLeftWidth: 5, // 左のアクセントボーダー
    borderLeftColor: '#17a2b8', // タスクのデフォルトカラー (例: info)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1, },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 1,
  },
  taskTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#212529',
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: '#6c757d',
    borderLeftColor: '#6c757d', // 完了タスクのアクセントカラー
  },
  taskDescription: {
    fontSize: 14,
    color: '#495057',
    marginTop: 4,
  },
  taskActions: {
    flexDirection: 'row',
    marginTop: 12, // 少し上にスペース
    justifyContent: 'flex-end',
  },
  taskButton: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70, // ボタンの最小幅
  },
  taskButtonDone: { backgroundColor: '#28a745' }, // 緑
  taskButtonUndo: { backgroundColor: '#ffc107' }, // 黄
  taskButtonDelete: { backgroundColor: '#dc3545' }, // 赤
  taskButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  formContainer: {
    marginTop: 20,
    paddingTop: 20, // 上にスペース
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  input: {
    height: 48, 
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f1f3f5',
    borderColor: '#dee2e6',
    borderWidth: 1,
    marginBottom: 12,
    fontSize: 15,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonPrimary: {
    marginTop: 8,
    height: 48,
    backgroundColor: '#007bff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  buttonSecondary: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonTextSecondary: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  fab: {
    position: 'absolute',
    width: 60, // 少し大きく
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: '#007bff',
    borderRadius: 30, // 半径を調整
    elevation: 8,
    shadowColor: '#000',
    shadowRadius: 5,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // 少し濃く
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20, // 横パディング
  },
  modalContent: {
    width: '100%', // 幅を画面いっぱいに
    maxWidth: 400, // 最大幅を設定
    backgroundColor: 'white',
    borderRadius: 12, // 角丸を少し大きく
    padding: 25, // パディングを少し大きく
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22, // 少し大きく
    fontWeight: 'bold',
    marginBottom: 25, // マージン調整
    textAlign: 'center',
    color: '#343a40',
  },
  formSection: {
    marginBottom: 20, // マージン調整
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10, // マージン調整
    color: '#495057',
  },
  separator: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 20, // マージン調整
  }
});