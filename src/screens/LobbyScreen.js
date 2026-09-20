// src/screens/LobbyScreen.js
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { db } from '../../firebaseConfig'; // Gaat 2 mappen omhoog om bij de config te komen
import { ref, set, onValue, update } from 'firebase/database';

const WORDS = ['APPEL', 'HUIS', 'AUTO', 'KAT', 'BOOM', 'FIETS', 'ZON', 'VIS'];

export default function LobbyScreen({ setAppState, setRole, setRoomCode, setWordToDraw }) {
  const [joinCode, setJoinCode] = useState('');

  const createRoom = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    
    set(ref(db, `rooms/${code}`), {
      status: 'waiting',
      word: randomWord,
      winner: false,
      paths: []
    });

    setRoomCode(code);
    setWordToDraw(randomWord);
    setRole('host');
    setAppState('hosting');
  };

  const joinRoom = () => {
    if (joinCode.length !== 4) return Alert.alert("Fout", "Vul een 4-cijferige code in.");
    
    const roomRef = ref(db, `rooms/${joinCode}`);
    onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.status === 'waiting') {
        update(roomRef, { status: 'playing' }); 
        setRoomCode(joinCode);
        setRole('guest');
        setAppState('playing');
      } else if (!data) {
        Alert.alert("Oeps!", "Deze kamer bestaat niet.");
      }
    }, { onlyOnce: true });
  };

  return (
    <View style={styles.centerContainer}>
      <Text style={styles.title}>Tilt Pictionary</Text>
      
      <TouchableOpacity style={styles.bigButton} onPress={createRoom}>
        <Text style={styles.buttonText}>Maak een Kamer (Host)</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TextInput 
        style={styles.input} 
        placeholder="Kamer Code (4 cijfers)" 
        placeholderTextColor="#666"
        keyboardType="number-pad"
        maxLength={4}
        value={joinCode}
        onChangeText={setJoinCode}
      />
      
      <TouchableOpacity style={[styles.bigButton, {backgroundColor: '#34C759'}]} onPress={joinRoom}>
        <Text style={styles.buttonText}>Join Kamer (Rader)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginBottom: 40 },
  bigButton: { backgroundColor: '#007AFF', padding: 20, borderRadius: 15, width: '100%', alignItems: 'center', marginVertical: 10 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  divider: { height: 1, width: '100%', backgroundColor: '#333', marginVertical: 30 },
  input: { backgroundColor: '#2c2c2e', color: '#FFF', fontSize: 24, padding: 20, borderRadius: 15, width: '100%', textAlign: 'center', marginBottom: 15 }
});