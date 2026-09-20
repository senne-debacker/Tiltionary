import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Dimensions, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { db } from './firebaseConfig';
import { ref, set, onValue, update, remove } from 'firebase/database';

const { width, height } = Dimensions.get('window');
const BALL_RADIUS = 10;
const SENSITIVITY = 15;
const WORDS = ['APPEL', 'HUIS', 'AUTO', 'KAT', 'BOOM', 'FIETS', 'ZON', 'VIS'];

export default function App() {
  // --- MULTIPLAYER STATE ---
  const [appState, setAppState] = useState('lobby'); 
  const [role, setRole] = useState(null); 
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [wordToDraw, setWordToDraw] = useState('');
  const [guessInput, setGuessInput] = useState('');

  // --- DRAWING STATE ---
  const [drawState, setDrawState] = useState('waiting');
  const [position, setPosition] = useState({ x: width / 2, y: height / 2 });
  const [paths, setPaths] = useState([]);
  const [isPenLifted, setIsPenLifted] = useState(false);

  // --- REFS ---
  const posRef = useRef({ x: width / 2, y: height / 2 });
  const pathsRef = useRef([]);
  const drawStateRef = useRef('waiting');
  const penLiftedRef = useRef(false);
  const lastSyncTime = useRef(0); // De missende ref voor de 100ms update!

  useEffect(() => { pathsRef.current = paths; }, [paths]);
  useEffect(() => { drawStateRef.current = drawState; }, [drawState]);
  useEffect(() => { penLiftedRef.current = isPenLifted; }, [isPenLifted]);

  // ==========================================
  // FIREBASE MULTIPLAYER LOGICA
  // ==========================================
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

  useEffect(() => {
    if (!roomCode) return;
    const roomRef = ref(db, `rooms/${roomCode}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setAppState('lobby');
        setRoomCode('');
        Alert.alert("Game Over", "De host heeft het spel afgesloten.");
        return;
      }

      if (role === 'guest' && data.paths) {
        setPaths(data.paths);
      }

      if (role === 'host' && data.status === 'playing' && appState !== 'playing') {
        setAppState('playing');
      }

      if (data.winner) {
        setAppState('won');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    });

    return () => unsubscribe();
  }, [roomCode, appState, role]);

  const submitGuess = () => {
    if (!guessInput) return;
    const roomRef = ref(db, `rooms/${roomCode}`);
    onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data && guessInput.toUpperCase().trim() === data.word) {
        update(roomRef, { winner: true });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Helaas!", "Dat is niet het juiste woord.");
        setGuessInput('');
      }
    }, { onlyOnce: true });
  };

  // ==========================================
  // HARDWARE SENSOR & TEKEN LOGICA (Alleen host)
  // ==========================================
  useEffect(() => {
    Accelerometer.setUpdateInterval(16);
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      if (!roomCode || role !== 'host' || appState !== 'playing') return;

      const gForce = Math.sqrt(x * x + y * y + z * z);
      if (gForce > 2.2 && drawStateRef.current === 'drawing') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setDrawState('waiting');
        setPaths([]);
        set(ref(db, `rooms/${roomCode}/paths`), []); 
        return;
      }

      if (drawStateRef.current === 'waiting') return;

      let newX = posRef.current.x + x * SENSITIVITY;
      let newY = posRef.current.y - y * SENSITIVITY;

      let bounced = false;
      if (newX < BALL_RADIUS) { newX = BALL_RADIUS; bounced = true; }
      if (newX > width - BALL_RADIUS) { newX = width - BALL_RADIUS; bounced = true; }
      if (newY < BALL_RADIUS) { newY = BALL_RADIUS; bounced = true; }
      if (newY > height - 150 - BALL_RADIUS) { newY = height - 150 - BALL_RADIUS; bounced = true; }

      if (bounced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const newPos = { x: newX, y: newY };
      posRef.current = newPos;
      setPosition(newPos);

      if (!penLiftedRef.current && pathsRef.current.length > 0) {
        const currentPaths = [...pathsRef.current];
        const lastPathIndex = currentPaths.length - 1;
        const lastPoint = currentPaths[lastPathIndex].points[currentPaths[lastPathIndex].points.length - 1];
        
        if (lastPoint && Math.hypot(newX - lastPoint.x, newY - lastPoint.y) > 2) {
          currentPaths[lastPathIndex].points.push(newPos);
          setPaths(currentPaths);

          // Delta Updates naar Firebase (om de 100ms)
          const now = Date.now();
          if (now - lastSyncTime.current > 100) {
            set(ref(db, `rooms/${roomCode}/paths/${lastPathIndex}`), {
              color: currentPaths[lastPathIndex].color,
              points: currentPaths[lastPathIndex].points
            });
            lastSyncTime.current = now;
          }
        }
      }
    });

    return () => subscription.remove();
  }, [role, appState, roomCode]);

  // ==========================================
  // AANRAAK LOGICA
  // ==========================================
  const handleTouchStart = (e) => {
    if (role !== 'host' || appState !== 'playing') return;
    const { locationX, locationY } = e.nativeEvent;
    const initialPos = { x: locationX, y: locationY };

    if (drawState === 'waiting') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      posRef.current = initialPos;
      setPosition(initialPos);
      setDrawState('drawing');
      setPaths([{ color: '#007AFF', points: [initialPos] }]);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsPenLifted(true);
    }
  };

  const handleTouchEnd = () => {
    if (role !== 'host' || appState !== 'playing') return;
    if (drawState === 'drawing' && isPenLifted) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsPenLifted(false);
      setPaths([...paths, { color: '#007AFF', points: [posRef.current] }]);
    }
  };

  // ==========================================
  // UI WEERGAVES
  // ==========================================
  if (appState === 'lobby') {
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

  if (appState === 'hosting') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.subtitle}>Je kamer is gemaakt!</Text>
        <Text style={styles.roomCode}>{roomCode}</Text>
        <Text style={{color: '#888', marginTop: 20}}>Wachten tot je vriend de code invult...</Text>
      </View>
    );
  }

  if (appState === 'won') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>🎉 GOED GERADEN! 🎉</Text>
        <TouchableOpacity 
          style={styles.bigButton} 
          onPress={() => {
            if(role === 'host') remove(ref(db, `rooms/${roomCode}`));
            setAppState('lobby');
            setPaths([]);
          }}>
          <Text style={styles.buttonText}>Terug naar Lobby</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        {role === 'host' ? (
          <Text style={styles.headerText}>Jij tekent: <Text style={{fontWeight: 'bold', color: '#FF3B30'}}>{wordToDraw}</Text></Text>
        ) : (
          <Text style={styles.headerText}>Raad wat de ander tekent!</Text>
        )}
      </View>

      <View 
        style={[styles.canvas, { backgroundColor: role === 'host' && drawState === 'waiting' ? '#2c2c2e' : '#1c1c1e' }]}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleTouchStart}
        onResponderRelease={handleTouchEnd}
      >
        {role === 'host' && drawState === 'waiting' && (
          <Text style={styles.promptText}>Tap to drop the ball & start drawing</Text>
        )}

        <Svg height="100%" width="100%">
          {paths.map((pathObj, index) => {
            if(!pathObj || !pathObj.points) return null;
            const pointsString = pathObj.points.map(p => `${p.x},${p.y}`).join(' ');
            return (
              <Polyline key={index} points={pointsString} fill="none" stroke={pathObj.color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            );
          })}
          {role === 'host' && drawState === 'drawing' && (
            <Circle cx={position.x} cy={position.y} r={BALL_RADIUS} fill="#007AFF" opacity={isPenLifted ? 0.4 : 1} />
          )}
        </Svg>
      </View>

      {role === 'guest' && (
        <View style={styles.guessContainer}>
          <TextInput 
            style={styles.guessInput} 
            placeholder="Typ hier je gok..." 
            placeholderTextColor="#888"
            value={guessInput}
            onChangeText={setGuessInput}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.guessButton} onPress={submitGuess}>
            <Text style={styles.buttonText}>Raad!</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginBottom: 40 },
  subtitle: { color: '#FFF', fontSize: 20, marginBottom: 10 },
  roomCode: { color: '#34C759', fontSize: 60, fontWeight: '900', letterSpacing: 5 },
  bigButton: { backgroundColor: '#007AFF', padding: 20, borderRadius: 15, width: '100%', alignItems: 'center', marginVertical: 10 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  divider: { height: 1, width: '100%', backgroundColor: '#333', marginVertical: 30 },
  input: { backgroundColor: '#2c2c2e', color: '#FFF', fontSize: 24, padding: 20, borderRadius: 15, width: '100%', textAlign: 'center', marginBottom: 15 },
  header: { paddingTop: 60, paddingBottom: 20, backgroundColor: '#111', alignItems: 'center' },
  headerText: { color: '#FFF', fontSize: 18 },
  canvas: { flex: 1 },
  promptText: { position: 'absolute', top: '45%', width: '100%', textAlign: 'center', color: '#8e8e93', fontSize: 18 },
  guessContainer: { flexDirection: 'row', padding: 20, backgroundColor: '#111', paddingBottom: 40 },
  guessInput: { flex: 1, backgroundColor: '#2c2c2e', color: '#FFF', padding: 15, borderRadius: 10, marginRight: 10, fontSize: 16 },
  guessButton: { backgroundColor: '#34C759', padding: 15, borderRadius: 10, justifyContent: 'center' }
});