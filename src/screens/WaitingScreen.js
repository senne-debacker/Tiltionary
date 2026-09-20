// src/screens/WaitingScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList } from 'react-native';
import { db } from '../../firebaseConfig';
import { ref, onValue, update, remove } from 'firebase/database';

export default function WaitingScreen({ roomCode, role }) {
  const [players, setPlayers] = useState([]);

  // Luister live naar wie er in de kamer zit
  useEffect(() => {
    const playersRef = ref(db, `rooms/${roomCode}/players`);
    const unsubscribe = onValue(playersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Zet het Firebase-object om naar een array voor de FlatList
        const playerList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setPlayers(playerList);
      } else {
        setPlayers([]);
      }
    });

    return () => unsubscribe();
  }, [roomCode]);

  // Host: Start het spel door de status in Firebase aan te passen
  const startGame = () => {
    // We updaten nu de nieuwe gameState/status structuur!
    update(ref(db, `rooms/${roomCode}/gameState`), { status: 'playing' });
  };

  // Host: Verwijder een speler
  const kickPlayer = (playerId) => {
    remove(ref(db, `rooms/${roomCode}/players/${playerId}`));
  };

  // Hoe één rij (speler) eruitziet in de lijst
  const renderPlayer = ({ item }) => (
    <View style={styles.playerRow}>
      <Text style={styles.playerName}>{item.name} {item.isHost ? '👑' : ''}</Text>
      {role === 'host' && !item.isHost && (
        <TouchableOpacity onPress={() => kickPlayer(item.id)} style={styles.kickButton}>
          <Text style={styles.kickText}>X</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kamer Code: <Text style={styles.highlight}>{roomCode}</Text></Text>

      <View style={styles.listContainer}>
        <Text style={styles.subtitle}>Spelers in de lobby ({players.length}):</Text>
        <FlatList
          data={players}
          keyExtractor={(item) => item.id}
          renderItem={renderPlayer}
          style={styles.playerList}
        />
      </View>

      {/* GASTEN ZIEN DE SPELREGELS */}
      {role === 'guest' && (
        <View style={styles.rulesContainer}>
          <Text style={styles.rulesTitle}>📖 Spelregels</Text>
          <Text style={styles.rulesText}>• Iedereen tekent 1 keer.</Text>
          <Text style={styles.rulesText}>• Raad in de chat, hoe sneller hoe meer punten (tot 1000pt).</Text>
          <Text style={styles.rulesText}>• Top 3 snelste raders krijgen een bonus!</Text>
          <Text style={styles.rulesText}>• De tekenaar krijgt extra punten als het woord geraden wordt.</Text>
        </View>
      )}

      {/* HOST ZIET DE START KNOP */}
      {role === 'host' ? (
        <TouchableOpacity 
          style={[styles.startButton, players.length < 2 ? styles.disabledButton : null]} 
          onPress={startGame}
          // disabled={players.length < 2} // Zet dit uit commentaar als je écht met 2+ spelers wilt testen
        >
          <Text style={styles.startButtonText}>START SPEL</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.waitingText}>Wachten tot de host start...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', padding: 20, paddingTop: 60 },
  title: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  highlight: { color: '#34C759', fontSize: 32, letterSpacing: 3 },
  listContainer: { width: '100%', flex: 1, backgroundColor: '#111', borderRadius: 15, padding: 15, marginBottom: 20 },
  subtitle: { color: '#888', fontSize: 16, marginBottom: 10 },
  playerList: { flex: 1 },
  playerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2c2c2e', padding: 15, borderRadius: 10, marginBottom: 10 },
  playerName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  kickButton: { backgroundColor: '#FF3B30', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  kickText: { color: '#FFF', fontWeight: 'bold' },
  rulesContainer: { width: '100%', backgroundColor: '#1c1c1e', padding: 20, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#34C759' },
  rulesTitle: { color: '#34C759', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  rulesText: { color: '#FFF', fontSize: 14, marginBottom: 5, lineHeight: 20 },
  startButton: { backgroundColor: '#007AFF', padding: 20, borderRadius: 15, width: '100%', alignItems: 'center' },
  disabledButton: { backgroundColor: '#333' },
  startButtonText: { color: '#FFF', fontSize: 20, fontWeight: 'bold', letterSpacing: 1 },
  waitingText: { color: '#888', fontSize: 18, fontStyle: 'italic', marginBottom: 20 }
});