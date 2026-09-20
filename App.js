import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { db } from './firebaseConfig';
import { ref, onValue } from 'firebase/database';

// Importeer al je mooie schermen!
import LobbyScreen from './src/screens/LobbyScreen';
import WaitingScreen from './src/screens/WaitingScreen';
import WinScreen from './src/screens/WinScreen';
import GameScreen from './src/screens/GameScreen';

export default function App() {
  // 1. De Master State (Dit is het enige dat App.js hoeft te onthouden)
  const [appState, setAppState] = useState('lobby'); 
  const [role, setRole] = useState(null); 
  const [roomCode, setRoomCode] = useState('');
  const [wordToDraw, setWordToDraw] = useState('');
  const [paths, setPaths] = useState([]);

  // 2. De Firebase Watcher (Luistert of de kamer wijzigt)
  useEffect(() => {
    if (!roomCode) return;
    const roomRef = ref(db, `rooms/${roomCode}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      
      // Is de kamer verwijderd door de host? Terug naar de lobby!
      if (!data) {
        setAppState('lobby');
        setRoomCode('');
        Alert.alert("Game Over", "De host heeft het spel afgesloten.");
        return;
      }

      // Guest: Update live de getekende lijnen
      if (role === 'guest' && data.paths) setPaths(data.paths);

      // Host: Als de guest de kamer joint, verander naar 'playing'
      if (role === 'host' && data.status === 'playing' && appState !== 'playing') {
        setAppState('playing');
      }

      // Winnaar!
      if (data.winner) {
        setAppState('won');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    });

    return () => unsubscribe();
  }, [roomCode, appState, role]);


  // 3. De Verkeersregelaar (Welk scherm moeten we tonen?)
  if (appState === 'lobby') {
    return <LobbyScreen setAppState={setAppState} setRole={setRole} setRoomCode={setRoomCode} setWordToDraw={setWordToDraw} />;
  }

  if (appState === 'hosting') {
    return <WaitingScreen roomCode={roomCode} />;
  }

  if (appState === 'won') {
    return <WinScreen role={role} roomCode={roomCode} setAppState={setAppState} setPaths={setPaths} />;
  }

  if (appState === 'playing') {
    return <GameScreen role={role} roomCode={roomCode} wordToDraw={wordToDraw} appState={appState} paths={paths} setPaths={setPaths} />;
  }
}