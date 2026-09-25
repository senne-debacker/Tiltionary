// The heart of the game: the drawer draws and everyone else guesses in the
// chat. Shown during the "choosing" and "playing" phases.
//
// The screen mounts fresh for every turn, so the local drawing always starts
// empty without any reset logic.

import { StyleSheet, View, Text, KeyboardAvoidingView, Platform } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";
import DrawingCanvas from "@/components/drawing-canvas";
import ChatPanel from "@/components/chat-panel";
import TimerBar from "@/components/timer-bar";
import ColorPicker from "@/components/color-picker";
import DrawingToolbar from "@/components/drawing-toolbar";
import LeaveButton from "@/components/leave-button";
import { Button } from "@/components/button";
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
import { BRAND_COLORS, canvas, fonts, radius, spacing, stroke } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CodeLabel, ThemedText } from "@/components/themed-text";
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
    ? "Jij tekent, dus jij raadt niet"
    : haveGuessed
      ? "Je hebt het al geraden!"
      : "Typ je gok...";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerInfo}>
            <CodeLabel>{`ronde ${gameState?.currentRound || 1}/${settings?.maxRounds || 3}`}</CodeLabel>
            <View style={[styles.pill, { borderColor: theme.line, backgroundColor: theme.greenSoft }]}>
              <ThemedText type="code" style={styles.pillText}>
                {`${guessCount}/${guessers.length} geraden`}
              </ThemedText>
            </View>
          </View>
          <LeaveButton isHost={isHost} onPress={onLeave} />
        </View>

        <ThemedText type="title" style={styles.word} numberOfLines={1} adjustsFontSizeToFit>
          {wordDisplay}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted" style={styles.drawerLine}>
          {isDrawer ? "Jij tekent" : `${drawerName} tekent`}
          {!isDrawer && word && !isChoosing ? ` · ${word.length} letters` : ""}
        </ThemedText>

        {isPlaying && <TimerBar msLeft={msLeft} totalMs={gameState?.turnDurationMs} />}
      </View>

      {isDrawer && isPlaying && <ColorPicker value={inkColor} onChange={setInkColor} />}

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
            ? "tik om het balletje te laten vallen"
            : undefined
        }
      >
        {isChoosing && (
          <View style={styles.overlay}>
            {isDrawer ? (
              <>
                <Text style={styles.overlayTitle}>Kies een woord</Text>
                <Text style={styles.overlaySub}>
                  {`// nog ${Math.ceil(msLeft / 1000)}s, anders kiezen wij`}
                </Text>
                {(gameState?.wordChoices || []).map((choice, index) => (
                  <Button
                    key={choice}
                    label={choice}
                    color={BRAND_COLORS[index % BRAND_COLORS.length]}
                    size="lg"
                    onPress={() => handleChooseWord(choice)}
                    style={styles.wordButton}
                  />
                ))}
              </>
            ) : (
              <>
                <Text style={styles.overlayTitle}>{drawerName} kiest een woord</Text>
                <Text style={styles.overlaySub}>{"// maak je klaar om te raden"}</Text>
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
        style={styles.chat}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, gap: spacing.xs },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  headerInfo: { gap: spacing.xs, alignItems: "flex-start" },
  pill: {
    borderWidth: stroke.thin,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  pillText: { color: "#1F1F1F" },
  word: { textAlign: "center", letterSpacing: 3 },
  drawerLine: { textAlign: "center", marginBottom: spacing.xs },
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
    padding: spacing.xl,
  },
  overlayTitle: {
    color: "#FFFFFF",
    fontFamily: fonts.bold,
    fontSize: 28,
    textAlign: "center",
  },
  overlaySub: {
    color: "#BDC1C6",
    fontFamily: fonts.mono,
    fontSize: 13,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  wordButton: { alignSelf: "stretch", marginBottom: spacing.md },
  chat: { marginTop: spacing.md },
});
