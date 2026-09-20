// src/screens/WinScreen.js
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { db } from '../../firebaseConfig'; 
import { ref, remove } from 'firebase/database';

export default function WinScreen({ role, roomCode, setAppState, setPaths }) {
  
  const handleBackToLobby = () => {
    // Als de host weggaat, gooien we de kamer in de database netjes weg
    if (role === 'host') {
      remove(ref(db, `rooms/${roomCode}`));
    }
    setPaths([]); // Maak het canvas leeg voor een volgend potje
    setAppState('lobby');
  };

  return (
    <View style={styles.centerContainer}>
      <Text style={styles.title}>🎉 GOED GERADEN! 🎉</Text>
      <TouchableOpacity style={styles.bigButton} onPress={handleBackToLobby}>
        <Text style={styles.buttonText}>Terug naar Lobby</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginBottom: 40 },
  bigButton: { backgroundColor: '#007AFF', padding: 20, borderRadius: 15, width: '100%', alignItems: 'center', marginVertical: 10 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});