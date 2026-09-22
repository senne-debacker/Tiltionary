// src/screens/GameScreen.js
// Het hart van het spel: de tekenaar tekent, de rest raadt via de chat.
// Dit scherm wordt gebruikt tijdens 'choosing' (woord kiezen) en 'playing'.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";
import { ref, onValue } from "firebase/database";
import { db } from "../../firebaseConfig";
import DrawingCanvas from "../components/DrawingCanvas";
import ChatPanel from "../components/ChatPanel";
import TimerBar from "../components/TimerBar";
import ColorPicker from "../components/ColorPicker";
import DrawingToolbar from "../components/DrawingToolbar";
import LeaveButton from "../components/LeaveButton";
import useTiltDrawing from "../hooks/useTiltDrawing";
import { useCountdown } from "../hooks/useServerTime";
import {
  syncPoints,
  clearDrawing,
  undoLastPath,
  publishCanvasSize,
  normalizePaths,
} from "../logic/drawing";
import { startDrawingTurn, sendGuess } from "../logic/room";
import { colors, radius, INK_COLORS } from "../theme";

export default function GameScreen({
  roomCode,
  playerId,
  nickname,
  gameState,
  players,
  isHost,
  onLeave,
  settings,
  serverNow,
  onCorrectGuess,
}) {
  useKeepAwake();

  const isDrawer = gameState?.currentDrawerId === playerId;
  const isChoosing = gameState?.status === "choosing";
  const isPlaying = gameState?.status === "playing";

  const [remoteDrawing, setRemoteDrawing] = useState(null);
  const [chat, setChat] = useState({});
  const [guessed, setGuessed] = useState({});
  const [inkColor, setInkColor] = useState(INK_COLORS[0]);
  const canvasSize = useRef(null);

  const msLeft = useCountdown(gameState?.phaseEndsAt, serverNow);
  const haveGuessed = !!guessed[playerId];

  // --------------------------------------------------------------- Tekenen

  const handleSyncPoints = useCallback(
    (payload) => syncPoints({ code: roomCode, ...payload }),
    [roomCode],
  );
  const handleClearRemote = useCallback(
    () => clearDrawing({ code: roomCode }),
    [roomCode],
  );
  const handleUndoRemote = useCallback(
    (pathIndex) => undoLastPath({ code: roomCode, pathIndex }),
    [roomCode],
  );

  const {
    paths: localPaths,
    position,
    drawState,
    isPenLifted,
    canUndo,
    handleTouchStart,
    handleTouchEnd,
    handleLayout,
    clear,
    undo,
  } = useTiltDrawing({
    enabled: isDrawer && isPlaying,
    color: inkColor,
    onSyncPoints: handleSyncPoints,
    onClearRemote: handleClearRemote,
    onUndoRemote: handleUndoRemote,
  });

  // Nieuwe beurt (nieuw woord): begin met een leeg canvas.
  useEffect(() => {
    clear();
  }, [gameState?.currentWord, gameState?.currentDrawerId, clear]);

  // De raders schalen de tekening naar hun eigen scherm. Daarvoor moeten ze
  // weten hoe groot het canvas van de tekenaar is.
  const onCanvasLayout = useCallback(
    (event) => {
      handleLayout(event);
      const { width, height } = event.nativeEvent.layout;
      canvasSize.current = { width, height };
      if (isDrawer) publishCanvasSize({ code: roomCode, width, height });
    },
    [handleLayout, isDrawer, roomCode],
  );

  useEffect(() => {
    if (!isDrawer || !isPlaying || !canvasSize.current) return;
    publishCanvasSize({ code: roomCode, ...canvasSize.current });
  }, [isDrawer, isPlaying, roomCode, gameState?.currentWord]);

  // ---------------------------------------------------------- Live data

  useEffect(() => {
    if (!roomCode) return;
    const unsubscribers = [
      onValue(ref(db, `rooms/${roomCode}/drawing`), (snap) =>
        setRemoteDrawing(snap.val()),
      ),
      onValue(ref(db, `rooms/${roomCode}/chat`), (snap) =>
        setChat(snap.val() || {}),
      ),
      onValue(ref(db, `rooms/${roomCode}/turn/guessed`), (snap) =>
        setGuessed(snap.val() || {}),
      ),
    ];
    return () => unsubscribers.forEach((off) => off());
  }, [roomCode]);

  const messages = useMemo(
    () =>
      Object.entries(chat)
        .map(([id, message]) => ({ id, ...message }))
        .sort((a, b) => (a.at || 0) - (b.at || 0)),
    [chat],
  );

  const remotePaths = useMemo(
    () => normalizePaths(remoteDrawing?.paths),
    [remoteDrawing],
  );

  const viewBox = useMemo(() => {
    const size = remoteDrawing?.canvas;
    if (isDrawer || !size?.width || !size?.height) return undefined;
    return `0 0 ${size.width} ${size.height}`;
  }, [isDrawer, remoteDrawing]);

  // ------------------------------------------------------------ Acties

  const handleChooseWord = (word) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startDrawingTurn({ code: roomCode, word, gameState, serverNow });
  };

  // useCallback is hier belangrijk: tijdens het tekenen rendert dit scherm
  // ~60x per seconde. Zonder dit zou de (memo'de) chat elke keer meerenderen.
  const handleSend = useCallback(
    async (text) => {
      const result = await sendGuess({
        code: roomCode,
        playerId,
        name: nickname,
        text,
        gameState,
        serverNow,
      });
      if (result.correct && !result.already) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onCorrectGuess?.(); // het "ding"-geluidje, alleen voor jezelf
      }
    },
    [roomCode, playerId, nickname, gameState, serverNow, onCorrectGuess],
  );

  // ------------------------------------------------------------- Weergave

  const guessers = Object.keys(players || {}).filter(
    (id) => id !== gameState?.currentDrawerId,
  );
  const guessCount = Object.keys(guessed).length;
  const drawerName = players?.[gameState?.currentDrawerId]?.name || "Speler";
  const word = gameState?.currentWord || "";

  // Raders zien alleen streepjes, tenzij ze het al geraden hebben.
  const wordDisplay = isChoosing
    ? "• • •"
    : isDrawer || haveGuessed
      ? word
      : word
          .split("")
          .map((char) => (char === " " ? "  " : "_"))
          .join(" ");

  const chatDisabled = isDrawer || haveGuessed || !isPlaying;
  const chatPlaceholder = isDrawer
    ? "Jij tekent — jij mag niet raden 😉"
    : haveGuessed
      ? "Je hebt het al geraden! 🎉"
      : "Typ je gok...";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.round}>
              Ronde {gameState?.currentRound || 1}/{settings?.maxRounds || 3}
            </Text>
            <Text style={styles.guessCount}>
              {guessCount}/{guessers.length} geraden
            </Text>
          </View>
          <LeaveButton isHost={isHost} onPress={onLeave} />
        </View>

        <Text style={styles.word}>{wordDisplay}</Text>
        <Text style={styles.drawerLine}>
          {isDrawer ? "Jij tekent" : `${drawerName} tekent`}
          {!isDrawer && word && !isChoosing ? ` · ${word.length} letters` : ""}
        </Text>

        {isPlaying && (
          <TimerBar msLeft={msLeft} totalMs={gameState?.turnDurationMs} />
        )}
      </View>

      {isDrawer && isPlaying && (
        <ColorPicker value={inkColor} onChange={setInkColor} />
      )}

      <DrawingCanvas
        paths={isDrawer ? localPaths : remotePaths}
        position={position}
        showBall={isDrawer && drawState === "drawing"}
        isPenLifted={isPenLifted}
        ballColor={inkColor}
        interactive={isDrawer && isPlaying}
        viewBox={viewBox}
        onLayout={onCanvasLayout}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        hint={
          isDrawer && isPlaying && drawState === "waiting"
            ? "Tik om het balletje te laten vallen"
            : undefined
        }
      >
        {isChoosing && (
          <View style={styles.overlay}>
            {isDrawer ? (
              <>
                <Text style={styles.overlayTitle}>Kies een woord</Text>
                <Text style={styles.overlaySub}>
                  Nog {Math.ceil(msLeft / 1000)}s — anders kiezen wij er een
                </Text>
                {(gameState?.wordChoices || []).map((choice) => (
                  <TouchableOpacity
                    key={choice}
                    style={styles.wordButton}
                    onPress={() => handleChooseWord(choice)}
                  >
                    <Text style={styles.wordButtonText}>{choice}</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <>
                <Text style={styles.overlayTitle}>
                  {drawerName} kiest een woord...
                </Text>
                <Text style={styles.overlaySub}>Maak je klaar om te raden!</Text>
              </>
            )}
          </View>
        )}
      </DrawingCanvas>

      {isDrawer && isPlaying && (
        <DrawingToolbar
          onUndo={undo}
          canUndo={canUndo}
          onClear={clear}
          canClear={localPaths.length > 0}
        />
      )}

      <ChatPanel
        messages={messages}
        onSend={handleSend}
        disabled={chatDisabled}
        placeholder={chatPlaceholder}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 55,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  round: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  guessCount: { color: colors.success, fontSize: 13, fontWeight: "600" },
  word: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "bold",
    letterSpacing: 4,
    textAlign: "center",
  },
  drawerLine: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 2,
    marginBottom: 10,
  },
  overlay: {
    // Expliciet uitgeschreven: StyleSheet.absoluteFillObject bestaat niet meer
    // in React Native 0.86. Spreaden van undefined geeft geen foutmelding,
    // waardoor dit blok stilletjes zijn absolute positie verloor en onder het
    // canvas viel (en door overflow:hidden onzichtbaar werd).
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  overlayTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  overlaySub: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 6,
    marginBottom: 24,
    textAlign: "center",
  },
  wordButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: radius.md,
    marginBottom: 12,
    width: "100%",
    alignItems: "center",
  },
  wordButtonText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 2,
  },
});
