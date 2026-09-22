import React, { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
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

  // De ding-sound wordt hier centraal beheerd (App.js unmount't nooit),
  // zodat een scherm-wissel naar WinScreen het geluid niet afkapt.
  const dingPlayer = useAudioPlayer(require('./assets/ding.mp3'));
  const hasPlayedWinSound = useRef(false);

  useEffect(() => {
    async function setupAudio() {
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
      } catch (e) {
        console.log('Audio mode error:', e);
      }
    }
    setupAudio();
  }, []);

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
      const actueelWoord = data.gameState?.currentWord;

      // Haal het woord op
      if (actueelWoord) {
        setWordToDraw(actueelWoord);
      }

      // Start het spel
      if (state === 'playing' && appState !== 'playing') {
        setAppState('playing');
        hasPlayedWinSound.current = false; // nieuw potje, geluid mag weer afspelen
      }

      // Check of er een winnaar is in de NIEUWE database structuur
      if (data.gameState?.winner) {
        setAppState('won');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Speel de ding maar 1x per potje af, en alleen voor de rader.
        // Dit gebeurt hier (in App.js, dat nooit unmount't) in plaats van in
        // GameScreen, omdat GameScreen meteen wordt vervangen door WinScreen
        // zodra 'winner' true wordt, waardoor het geluid daar werd
        // afgebroken voor je het kon horen.
        if (!hasPlayedWinSound.current && role === 'guest') {
          hasPlayedWinSound.current = true;
          try {
            dingPlayer.seekTo(0).finally(() => dingPlayer.play());
          } catch (e) {
            console.log('Fout bij afspelen ding:', e);
          }
        }
      }

      // Live de getekende lijnen updaten (als je kijker bent)
      if (role === 'guest' && data.drawing?.paths) {
        setPaths(data.drawing.paths);
      }
    });

    return () => unsubscribe();
  }, [roomCode, appState, role, playerId]);

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