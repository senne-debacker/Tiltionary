// The heart of the game: the drawer draws and everyone else guesses in the
// chat. Shown during the "choosing" and "playing" phases.
//
// The screen mounts fresh for every turn, so the local drawing always starts
// empty without any reset logic.

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
import DrawingCanvas from "@/components/drawing-canvas";
import ChatPanel from "@/components/chat-panel";
import TimerBar from "@/components/timer-bar";
import ColorPicker from "@/components/color-picker";
import DrawingToolbar from "@/components/drawing-toolbar";
import LeaveButton from "@/components/leave-button";
import useTiltDrawing from "@/hooks/use-tilt-drawing";
import { useCountdown, serverNow } from "@/hooks/use-server-time";
import { useSessionStore } from "@/hooks/use-session-store";
import { useRoomStore, useChatMessages } from "@/hooks/use-room-store";
import { useLeaveRoom } from "@/hooks/use-leave-room";
import { playDing } from "@/logic/feedback";
import {
  syncPoints,
  clearDrawing,
  undoLastPath,
  publishCanvasSize,
  normalizePaths,
} from "@/logic/drawing";
import { startDrawingTurn, sendGuess } from "@/logic/room";
import { canvas, radius, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
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
  const guessed = useRoomStore((state) => state.guessed);
  const remoteDrawing = useRoomStore((state) => state.drawing);
  const messages = useChatMessages();
  const onLeave = useLeaveRoom();
  const insets = useSafeAreaInsets();

  const isDrawer = gameState?.currentDrawerId === playerId;
  const isChoosing = gameState?.status === "choosing";
  const isPlaying = gameState?.status === "playing";

  const msLeft = useCountdown(gameState?.phaseEndsAt);
  const theme = useTheme();
  const haveGuessed = !!guessed[playerId];

  // ---- Drawing ----

  const handleSyncPoints = (payload: SyncPointsPayload) =>
    syncPoints({ code: roomCode, ...payload });
  const handleClearRemote = () => clearDrawing({ code: roomCode });
  const handleUndoRemote = (pathIndex: number) =>
    undoLastPath({ code: roomCode, pathIndex });

  const {
    paths: localPaths,
    position,
    drawState,
    isPenLifted,
    color: inkColor,
    setColor: setInkColor,
    canUndo,
    handleTouchStart,
    handleTouchEnd,
    handleLayout,
    clear,
    undo,
  } = useTiltDrawing({
    enabled: isDrawer && isPlaying,
    onSyncPoints: handleSyncPoints,
    onClearRemote: handleClearRemote,
    onUndoRemote: handleUndoRemote,
  });

  // Guessers scale the drawing to their own screen, so they need the size of
  // the drawer's canvas. onLayout fires again when the toolbars appear at the
  // start of the turn, so the published size always matches.
  const onCanvasLayout = (event: LayoutChangeEvent) => {
    handleLayout(event);
    const { width, height } = event.nativeEvent.layout;
    if (isDrawer) publishCanvasSize({ code: roomCode, width, height });
  };

  const remotePaths = normalizePaths(remoteDrawing?.paths);

  const canvasDims = remoteDrawing?.canvas;
  const viewBox =
    isDrawer || !canvasDims?.width || !canvasDims?.height
      ? undefined
      : `0 0 ${canvasDims.width} ${canvasDims.height}`;

  // ---- Actions ----

  const handleChooseWord = (word: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!gameState) return;
    startDrawingTurn({ code: roomCode, word, gameState, serverNow });
  };

  const handleSend = async (text: string) => {
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
      playDing();
    }
  };

  // ---- Display ----

  const guessers = Object.keys(players || {}).filter(
    (id) => id !== gameState?.currentDrawerId,
  );
  const guessCount = Object.keys(guessed).length;
  const drawerName = players?.[gameState?.currentDrawerId ?? ""]?.name || "Speler";
  const word = gameState?.currentWord || "";

  // Guessers only see blanks until they guess the word.
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
      <View
        style={[
          styles.header,
          { backgroundColor: theme.surface, paddingTop: insets.top + spacing.sm },
        ]}
      >
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
    // StyleSheet.absoluteFillObject was removed in React Native 0.86.
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
