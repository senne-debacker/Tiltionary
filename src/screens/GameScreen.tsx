// src/screens/GameScreen.tsx
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
import DrawingCanvas from "@/components/drawing-canvas";
import ChatPanel from "@/components/chat-panel";
import TimerBar from "@/components/timer-bar";
import ColorPicker from "@/components/color-picker";
import DrawingToolbar from "@/components/drawing-toolbar";
import LeaveButton from "@/components/leave-button";
import useTiltDrawing from "@/hooks/use-tilt-drawing";
import { useCountdown, serverNow } from "@/hooks/use-server-time";
import { useSessionStore } from "@/hooks/use-session-store";
import { useRoomStore } from "@/hooks/use-room-store";
import { useLeaveRoom } from "@/hooks/use-leave-room";
import { playDing } from "@/hooks/use-ding-sound";
import {
  syncPoints,
  clearDrawing,
  undoLastPath,
  publishCanvasSize,
  normalizePaths,
} from "@/logic/drawing";
import { startDrawingTurn, sendGuess } from "@/logic/room";
import { canvas, radius, spacing, INK_COLORS } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ThemedText } from "@/components/themed-text";
import type {
  ChatMap,
  ChatMessageWithId,
  GuessedMap,
  RoomDrawing,
} from "@/types/game";
import type { SyncPointsPayload } from "@/hooks/use-tilt-drawing";
import type { LayoutChangeEvent } from "react-native";

export default function GameScreen() {
  useKeepAwake();

  const roomCode = useSessionStore((state) => state.code);
  const playerId = useSessionStore((state) => state.playerId);
  const nickname = useSessionStore((state) => state.nickname);
  const isHost = useSessionStore((state) => state.isHost);
  const gameState = useRoomStore((state) => state.gameState);
  const players = useRoomStore((state) => state.players);
  const settings = useRoomStore((state) => state.settings);
  const onLeave = useLeaveRoom();

  const isDrawer = gameState?.currentDrawerId === playerId;
  const isChoosing = gameState?.status === "choosing";
  const isPlaying = gameState?.status === "playing";

  const [remoteDrawing, setRemoteDrawing] = useState<RoomDrawing | null>(null);
  const [chat, setChat] = useState<ChatMap>({});
  const [guessed, setGuessed] = useState<GuessedMap>({});
  const [inkColor, setInkColor] = useState(INK_COLORS[0]);
  const canvasSize = useRef<{ width: number; height: number } | null>(null);

  const msLeft = useCountdown(gameState?.phaseEndsAt);
  const theme = useTheme();
  const haveGuessed = !!guessed[playerId];

  // ---- Tekenen ----

  const handleSyncPoints = useCallback(
    (payload: SyncPointsPayload) => syncPoints({ code: roomCode, ...payload }),
    [roomCode],
  );
  const handleClearRemote = useCallback(
    () => clearDrawing({ code: roomCode }),
    [roomCode],
  );
  const handleUndoRemote = useCallback(
    (pathIndex: number) => undoLastPath({ code: roomCode, pathIndex }),
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
    (event: LayoutChangeEvent) => {
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

  // ---- Live data ----

  useEffect(() => {
    if (!roomCode) return;
    const unsubscribers = [
      onValue(ref(db, `rooms/${roomCode}/drawing`), (snap) =>
        setRemoteDrawing(snap.val() as RoomDrawing | null),
      ),
      onValue(ref(db, `rooms/${roomCode}/chat`), (snap) =>
        setChat((snap.val() as ChatMap | null) || {}),
      ),
      onValue(ref(db, `rooms/${roomCode}/turn/guessed`), (snap) =>
        setGuessed((snap.val() as GuessedMap | null) || {}),
      ),
    ];
    return () => unsubscribers.forEach((off) => off());
  }, [roomCode]);

  const messages = useMemo(
    () =>
      Object.entries(chat)
        .map(([id, message]): ChatMessageWithId => ({ ...message, id }))
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

  // ---- Acties ----

  const handleChooseWord = (word: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!gameState) return;
    startDrawingTurn({ code: roomCode, word, gameState, serverNow });
  };

  // useCallback is hier belangrijk: tijdens het tekenen rendert dit scherm
  // ~60x per seconde. Zonder dit zou de (memo'de) chat elke keer meerenderen.
  const handleSend = useCallback(
    async (text: string) => {
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
        playDing(); // alleen voor jezelf
      }
    },
    [roomCode, playerId, nickname, gameState],
  );

  // ---- Weergave ----

  const guessers = Object.keys(players || {}).filter(
    (id) => id !== gameState?.currentDrawerId,
  );
  const guessCount = Object.keys(guessed).length;
  const drawerName = players?.[gameState?.currentDrawerId ?? ""]?.name || "Speler";
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
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.headerTop}>
          <View>
            <ThemedText themeColor="textMuted" style={styles.round}>
              Ronde {gameState?.currentRound || 1}/{settings?.maxRounds || 3}
            </ThemedText>
            <ThemedText themeColor="success" style={styles.guessCount}>
              {guessCount}/{guessers.length} geraden
            </ThemedText>
          </View>
          <LeaveButton isHost={isHost} onPress={onLeave} />
        </View>

        <ThemedText style={styles.word}>{wordDisplay}</ThemedText>
        <ThemedText themeColor="textMuted" style={styles.drawerLine}>
          {isDrawer ? "Jij tekent" : `${drawerName} tekent`}
          {!isDrawer && word && !isChoosing ? ` · ${word.length} letters` : ""}
        </ThemedText>

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
                    style={[styles.wordButton, { backgroundColor: theme.primary }]}
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
  container: { flex: 1 },
  header: {
    paddingTop: 55,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  round: { fontSize: 13, fontWeight: "600" },
  guessCount: { fontSize: 13, fontWeight: "600" },
  word: {
    fontSize: 26,
    fontWeight: "bold",
    letterSpacing: 4,
    textAlign: "center",
  },
  drawerLine: {
    fontSize: 13,
    textAlign: "center",
    marginTop: spacing.xs - 2,
    marginBottom: spacing.sm + 2,
  },
  overlay: {
    // Expliciet uitgeschreven: StyleSheet.absoluteFillObject bestaat niet meer
    // in React Native 0.86 — spreaden van undefined faalt stil en dit blok
    // zou zijn absolute positie kwijtraken.
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: canvas.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl,
  },
  overlayTitle: {
    color: "#F7F5FF",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  overlaySub: {
    color: canvas.hint,
    fontSize: 14,
    marginTop: spacing.sm - 2,
    marginBottom: spacing.xxl - 4,
    textAlign: "center",
  },
  wordButton: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    width: "100%",
    alignItems: "center",
  },
  wordButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 2,
  },
});
