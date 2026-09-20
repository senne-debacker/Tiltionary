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
  const [playerId, setPlayerId] = useState('');
  const [nickname, setNickname] = useState('');

// 2. De Firebase Watcher (Luistert of de kamer wijzigt)
  useEffect(() => {
    if (!roomCode) return;
    const roomRef = ref(db, `rooms/${roomCode}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      
      if (!data) {
        setAppState('lobby');
        setRoomCode('');
        Alert.alert("Game Over", "De kamer is gesloten.");
        return;
      }

      // Check of JIJ gekickt bent
      if (role === 'guest' && playerId && data.players && !data.players[playerId]) {
        setAppState('lobby');
        setRoomCode('');
        Alert.alert("Gekickt", "Je bent uit de kamer verwijderd door de host.");
        return;
      }

      // De nieuwe gameState checken!
      const state = data.gameState?.status;

      // Als de host op START klikt, verandert de status naar 'playing'
      if (state === 'playing' && appState !== 'playing') {
        setAppState('playing');
      }

      // Live de getekende lijnen updaten (als je kijker bent)
      if (role === 'guest' && data.drawing?.paths) {
        setPaths(data.drawing.paths);
      }
    });

    return () => unsubscribe();
  }, [roomCode, appState, role, playerId]); // <-- Zorg dat playerId hierbij staat!

  // 3. De Verkeersregelaar (Welk scherm moeten we tonen?)
if (appState === 'lobby') {
    return (
      <LobbyScreen 
        setAppState={setAppState} 
        setRole={setRole} 
        setRoomCode={setRoomCode} 
        setPlayerId={setPlayerId}   // <--- NIEUW
        setNickname={setNickname}   // <--- NIEUW
      />
    );
  }

if (appState === 'hosting') {
    return <WaitingScreen roomCode={roomCode} role={role} />;
  }

  if (appState === 'won') {
    return <WinScreen role={role} roomCode={roomCode} setAppState={setAppState} setPaths={setPaths} />;
  }

if (appState === 'playing') {
    return <GameScreen role={role} roomCode={roomCode} wordToDraw={wordToDraw} appState={appState} paths={paths} setPaths={setPaths} setAppState={setAppState} />;
  }
}