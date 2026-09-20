// src/screens/GameScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Dimensions, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { db } from '../../firebaseConfig';
import { ref, set, onValue, update } from 'firebase/database';

const { width, height } = Dimensions.get('window');
const BALL_RADIUS = 10;
const SENSITIVITY = 15;

export default function GameScreen({ role, roomCode, wordToDraw, appState, paths, setPaths }) {
  // Lokale state, alleen nodig voor het tekenen en raden
  const [guessInput, setGuessInput] = useState('');
  const [drawState, setDrawState] = useState('waiting');
  const [position, setPosition] = useState({ x: width / 2, y: height / 2 });
  const [isPenLifted, setIsPenLifted] = useState(false);

  // Refs voor de 60fps loop
  const posRef = useRef({ x: width / 2, y: height / 2 });
  const pathsRef = useRef([]);
  const drawStateRef = useRef('waiting');
  const penLiftedRef = useRef(false);
  const lastSyncTime = useRef(0);

  // Sync state naar refs
  useEffect(() => { pathsRef.current = paths; }, [paths]);
  useEffect(() => { drawStateRef.current = drawState; }, [drawState]);
  useEffect(() => { penLiftedRef.current = isPenLifted; }, [isPenLifted]);

  // Raden
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

  // Hardware Sensoren
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

  // Touch Controls
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
  header: { paddingTop: 60, paddingBottom: 20, backgroundColor: '#111', alignItems: 'center' },
  headerText: { color: '#FFF', fontSize: 18 },
  canvas: { flex: 1 },
  promptText: { position: 'absolute', top: '45%', width: '100%', textAlign: 'center', color: '#8e8e93', fontSize: 18 },
  guessContainer: { flexDirection: 'row', padding: 20, backgroundColor: '#111', paddingBottom: 40 },
  guessInput: { flex: 1, backgroundColor: '#2c2c2e', color: '#FFF', padding: 15, borderRadius: 10, marginRight: 10, fontSize: 16 },
  guessButton: { backgroundColor: '#34C759', padding: 15, borderRadius: 10, justifyContent: 'center' },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});