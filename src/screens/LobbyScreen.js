// src/screens/LobbyScreen.js
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { db } from '../../firebaseConfig'; 
import { ref, set, get, child } from 'firebase/database';

export default function LobbyScreen({ setAppState, setRole, setRoomCode, setPlayerId, setNickname }) {
  const [joinCode, setJoinCode] = useState('');
  const [nameInput, setNameInput] = useState('');

  // 1. HOST MAAKT EEN KAMER
  const createRoom = () => {
    if (nameInput.trim().length < 2) return Alert.alert("Fout", "Vul een naam in van minstens 2 letters.");
    
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const myPlayerId = 'host_' + Date.now(); // Unieke ID voor deze speler
    
    // De gloednieuwe Party Mode database structuur!
    const initialRoomData = {
      settings: {
        maxRounds: 3,
        timerSeconds: 60,
        wordPack: 'general'
      },
      gameState: {
        status: 'lobby', // 'lobby', 'announcement', 'playing', 'scoreboard', 'podium'
        currentRound: 1,
        currentDrawerId: '',
        currentWord: '',
        timeRemaining: 60
      },
      players: {
        [myPlayerId]: {
          name: nameInput.trim(),
          isHost: true,
          score: 0,
          hasGuessed: false
        }
      },
      drawing: { paths: [] },
      chat: {}
    };

    // Zet de boomstructuur in Firebase
    set(ref(db, `rooms/${code}`), initialRoomData);

    // Update de lokale state van de telefoon
    setPlayerId(myPlayerId);
    setNickname(nameInput.trim());
    setRoomCode(code);
    setRole('host');
    setAppState('hosting'); // Ga naar de instellingen/wachtruimte
  };

  // 2. GAST JOINT EEN KAMER
  const joinRoom = async () => {
    if (nameInput.trim().length < 2) return Alert.alert("Fout", "Vul je naam in.");
    if (joinCode.length !== 4) return Alert.alert("Fout", "Vul een 4-cijferige code in.");
    
    const roomRef = ref(db, `rooms/${joinCode}`);
    
    try {
      // Haal één keer de data op om te checken of de kamer bestaat en open is
      const snapshot = await get(roomRef);
      const data = snapshot.val();

      if (data && data.gameState && data.gameState.status === 'lobby') {
        const myPlayerId = 'guest_' + Date.now();
        
        // Voeg deze speler toe aan het "players" lijstje in Firebase
        await set(child(roomRef, `players/${myPlayerId}`), {
          name: nameInput.trim(),
          isHost: false,
          score: 0,
          hasGuessed: false
        });

        // Update de lokale state
        setPlayerId(myPlayerId);
        setNickname(nameInput.trim());
        setRoomCode(joinCode);
        setRole('guest');
        setAppState('hosting'); // Gasten gaan nu óók naar de wachtruimte (GuestLobbyScreen later)
      } else if (data && data.gameState.status !== 'lobby') {
        Alert.alert("Te laat!", "Dit spel is al begonnen.");
      } else {
        Alert.alert("Oeps!", "Deze kamer bestaat niet.");
      }
    } catch (error) {
      Alert.alert("Fout", "Kon geen verbinding maken.");
    }
  };

  // 3. SANDBOX MODUS
  const startSolo = () => {
    setRole('solo');
    setRoomCode('');
    setAppState('playing');
  };

  return (
    <View style={styles.centerContainer}>
      <Text style={styles.title}>Tilt Pictionary</Text>
      
      <TextInput 
        style={styles.nameInput} 
        placeholder="Kies je Nickname" 
        placeholderTextColor="#888"
        maxLength={12}
        value={nameInput}
        onChangeText={setNameInput}
        autoCapitalize="words"
      />

      <View style={styles.divider} />
      
      <TouchableOpacity style={styles.bigButton} onPress={createRoom}>
        <Text style={styles.buttonText}>Maak een Kamer (Host)</Text>
      </TouchableOpacity>

      <View style={styles.joinRow}>
        <TextInput 
          style={styles.codeInput} 
          placeholder="Code" 
          placeholderTextColor="#666"
          keyboardType="number-pad"
          maxLength={4}
          value={joinCode}
          onChangeText={setJoinCode}
        />
        <TouchableOpacity style={styles.joinButton} onPress={joinRoom}>
          <Text style={styles.buttonText}>Join</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <TouchableOpacity style={[styles.bigButton, {backgroundColor: '#8E8E93'}]} onPress={startSolo}>
        <Text style={styles.buttonText}>Sandbox / Solo</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.infoButton} onPress={() => Alert.alert("Hoe werkt het?", "Hou je telefoon plat. Kantel om te tekenen. Tik om je pen op te tillen. Schud om je scherm te wissen!")}>
        <Text style={styles.infoText}>ℹ️ Hoe werkt het tekenen?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  nameInput: { backgroundColor: '#2c2c2e', color: '#FFF', fontSize: 24, padding: 15, borderRadius: 15, width: '100%', textAlign: 'center', borderWidth: 2, borderColor: '#007AFF' },
  bigButton: { backgroundColor: '#007AFF', padding: 20, borderRadius: 15, width: '100%', alignItems: 'center', marginVertical: 10 },
  joinRow: { flexDirection: 'row', width: '100%', marginTop: 10, justifyContent: 'space-between' },
  codeInput: { flex: 1, backgroundColor: '#2c2c2e', color: '#FFF', fontSize: 24, padding: 15, borderRadius: 15, textAlign: 'center', marginRight: 10 },
  joinButton: { backgroundColor: '#34C759', padding: 20, borderRadius: 15, justifyContent: 'center', alignItems: 'center', width: 100 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  divider: { height: 1, width: '100%', backgroundColor: '#333', marginVertical: 20 },
  infoButton: { marginTop: 30, padding: 10 },
  infoText: { color: '#007AFF', fontSize: 16 }
});