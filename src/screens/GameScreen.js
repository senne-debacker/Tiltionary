// src/screens/GameScreen.js
import React, { useState, useEffect, useRef } from "react";
import { useKeepAwake } from "expo-keep-awake";
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Accelerometer } from "expo-sensors";
import * as Haptics from "expo-haptics";
import Svg, { Polyline, Circle } from "react-native-svg";
import { db } from "../../firebaseConfig";
import { ref, set, onValue, update } from "firebase/database";

const { width, height } = Dimensions.get("window");
const BALL_RADIUS = 10;
const SENSITIVITY = 15;

export default function GameScreen({
  role,
  roomCode,
  wordToDraw,
  appState,
  paths,
  setPaths,
  setAppState,
}) {
  useKeepAwake();

  const [guessInput, setGuessInput] = useState("");
  const [drawState, setDrawState] = useState("waiting");
  const [position, setPosition] = useState({ x: width / 2, y: height / 2 });
  const [isPenLifted, setIsPenLifted] = useState(false);

  const posRef = useRef({ x: width / 2, y: height / 2 });
  const pathsRef = useRef([]);
  const drawStateRef = useRef("waiting");
  const penLiftedRef = useRef(false);
  const lastSyncTime = useRef(0);
  const syncedPathIndexRef = useRef(-1);
  const syncedPointCountRef = useRef(0);

  useEffect(() => {
    pathsRef.current = paths;
  }, [paths]);
  useEffect(() => {
    drawStateRef.current = drawState;
  }, [drawState]);
  useEffect(() => {
    penLiftedRef.current = isPenLifted;
  }, [isPenLifted]);

  const submitGuess = () => {
    if (!guessInput) return;
    const roomRef = ref(db, `rooms/${roomCode}`);

    onValue(
      roomRef,
      (snapshot) => {
        const data = snapshot.val();

        // Controleer of de gok klopt met het nieuwe gameState adres
        if (
          data &&
          data.gameState &&
          guessInput.toUpperCase().trim() === data.gameState.currentWord
        ) {
          // Het geluid wordt in App.js afgespeeld zodra 'winner' true wordt,
          // zodat het niet wordt afgebroken door de wissel naar WinScreen.
          // Zet de winnaar in de gameState
          update(ref(db, `rooms/${roomCode}/gameState`), { winner: true });
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert("Helaas!", "Dat is niet het juiste woord.");
          setGuessInput("");
        }
      },
      { onlyOnce: true },
    );
  };

  const quitSolo = () => {
    setPaths([]);
    setAppState("lobby");
  };

  useEffect(() => {
    Accelerometer.setUpdateInterval(16);
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      if (appState !== "playing") return;
      if (role !== "host" && role !== "solo") return;

      const gForce = Math.sqrt(x * x + y * y + z * z);
      if (gForce > 2.2 && drawStateRef.current === "drawing") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setDrawState("waiting");
        setPaths([]);
        if (role === "host" && roomCode)
          set(ref(db, `rooms/${roomCode}/drawing/paths`), []);
        syncedPathIndexRef.current = -1;
        syncedPointCountRef.current = 0;
        return;
      }

      if (drawStateRef.current === "waiting") return;

      let newX = posRef.current.x + x * SENSITIVITY;
      let newY = posRef.current.y - y * SENSITIVITY;
      let bounced = false;

      if (newX < BALL_RADIUS) {
        newX = BALL_RADIUS;
        bounced = true;
      }
      if (newX > width - BALL_RADIUS) {
        newX = width - BALL_RADIUS;
        bounced = true;
      }
      if (newY < BALL_RADIUS) {
        newY = BALL_RADIUS;
        bounced = true;
      }
      if (newY > height - 150 - BALL_RADIUS) {
        newY = height - 150 - BALL_RADIUS;
        bounced = true;
      }

      if (bounced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const newPos = { x: newX, y: newY };
      posRef.current = newPos;
      setPosition(newPos);

      if (!penLiftedRef.current && pathsRef.current.length > 0) {
        const currentPaths = [...pathsRef.current];
        const lastPathIndex = currentPaths.length - 1;
        const lastPoint =
          currentPaths[lastPathIndex].points[
            currentPaths[lastPathIndex].points.length - 1
          ];

        if (
          lastPoint &&
          Math.hypot(newX - lastPoint.x, newY - lastPoint.y) > 2
        ) {
          currentPaths[lastPathIndex].points.push(newPos);
          setPaths(currentPaths);

          if (role === "host" && roomCode) {
            // Nieuwe lijn (na optillen)? Begin de teller opnieuw, anders
            // slaan we per ongeluk de eerste punten van de nieuwe lijn over.
            if (syncedPathIndexRef.current !== lastPathIndex) {
              syncedPathIndexRef.current = lastPathIndex;
              syncedPointCountRef.current = 0;
            }

            const now = Date.now();
            if (now - lastSyncTime.current > 100) {
              const allPoints = currentPaths[lastPathIndex].points;
              const newPoints = allPoints.slice(syncedPointCountRef.current);

              if (newPoints.length > 0) {
                // Stuur alleen de NIEUWE punten (gemergd op hun eigen index)
                // i.p.v. steeds de hele, groeiende puntenlijst opnieuw te
                // verzenden. Dat laatste veroorzaakte de vertraging bij
                // lange lijnen: elke sync-tick werd het payload groter.
                const pathRef = `rooms/${roomCode}/drawing/paths/${lastPathIndex}`;
                const updates = {
                  [`${pathRef}/color`]: currentPaths[lastPathIndex].color,
                };
                newPoints.forEach((p, i) => {
                  updates[`${pathRef}/points/${syncedPointCountRef.current + i}`] = p;
                });
                update(ref(db), updates);
                syncedPointCountRef.current = allPoints.length;
              }
              lastSyncTime.current = now;
            }
          }
        }
      }
    });

    return () => subscription.remove();
  }, [role, appState, roomCode]);

  const handleTouchStart = (e) => {
    if ((role !== "host" && role !== "solo") || appState !== "playing") return;
    const { locationX, locationY } = e.nativeEvent;
    const initialPos = { x: locationX, y: locationY };

    if (drawState === "waiting") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      posRef.current = initialPos;
      setPosition(initialPos);
      setDrawState("drawing");
      setPaths([{ color: "#007AFF", points: [initialPos] }]);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsPenLifted(true);
    }
  };

  const handleTouchEnd = () => {
    if ((role !== "host" && role !== "solo") || appState !== "playing") return;
    if (drawState === "drawing" && isPenLifted) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsPenLifted(false);
      setPaths([...paths, { color: "#007AFF", points: [posRef.current] }]);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* HEADER LOGICA (Past zich aan op basis van de Rol) */}
      <View style={styles.header}>
        {role === "host" && (
          <Text style={styles.headerText}>
            Jij tekent:{" "}
            <Text style={{ fontWeight: "bold", color: "#FF3B30" }}>
              {wordToDraw}
            </Text>
          </Text>
        )}
        {role === "guest" && (
          <Text style={styles.headerText}>Raad wat de ander tekent!</Text>
        )}
        {role === "solo" && (
          <View style={styles.soloHeader}>
            <Text style={styles.headerText}>Sandbox Modus</Text>
            <TouchableOpacity onPress={quitSolo} style={styles.quitButton}>
              <Text style={styles.quitText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View
        style={[
          styles.canvas,
          {
            backgroundColor:
              (role === "host" || role === "solo") && drawState === "waiting"
                ? "#2c2c2e"
                : "#1c1c1e",
          },
        ]}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleTouchStart}
        onResponderRelease={handleTouchEnd}
      >
        {(role === "host" || role === "solo") && drawState === "waiting" && (
          <Text style={styles.promptText}>
            Tap to drop the ball & start drawing
          </Text>
        )}

        <Svg height="100%" width="100%">
          {paths.map((pathObj, index) => {
            if (!pathObj || !pathObj.points) return null;
            const pointsString = pathObj.points
              .map((p) => `${p.x},${p.y}`)
              .join(" ");
            return (
              <Polyline
                key={index}
                points={pointsString}
                fill="none"
                stroke={pathObj.color}
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
          {(role === "host" || role === "solo") && drawState === "drawing" && (
            <Circle
              cx={position.x}
              cy={position.y}
              r={BALL_RADIUS}
              fill="#007AFF"
              opacity={isPenLifted ? 0.4 : 1}
            />
          )}
        </Svg>
      </View>

      {/* RAADBALK (Alleen voor de rader) */}
      {role === "guest" && (
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
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#111",
    alignItems: "center",
  },
  headerText: { color: "#FFF", fontSize: 18, fontWeight: "600" },
  soloHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 30,
  },
  quitButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  quitText: { color: "#FFF", fontWeight: "bold" },
  canvas: { flex: 1 },
  promptText: {
    position: "absolute",
    top: "45%",
    width: "100%",
    textAlign: "center",
    color: "#8e8e93",
    fontSize: 18,
  },
  guessContainer: {
    flexDirection: "row",
    padding: 20,
    backgroundColor: "#111",
    paddingBottom: 40,
  },
  guessInput: {
    flex: 1,
    backgroundColor: "#2c2c2e",
    color: "#FFF",
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    fontSize: 16,
  },
  guessButton: {
    backgroundColor: "#34C759",
    padding: 15,
    borderRadius: 10,
    justifyContent: "center",
  },
  buttonText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
});
