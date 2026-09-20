// src/screens/WaitingScreen.js
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

export default function WaitingScreen({ roomCode }) {
  return (
    <View style={styles.centerContainer}>
      <Text style={styles.subtitle}>Je kamer is gemaakt!</Text>
      <Text style={styles.roomCode}>{roomCode}</Text>
      <Text style={{color: '#888', marginTop: 20}}>Wachten tot je vriend de code invult...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 20 },
  subtitle: { color: '#FFF', fontSize: 20, marginBottom: 10 },
  roomCode: { color: '#34C759', fontSize: 60, fontWeight: '900', letterSpacing: 5 },
});