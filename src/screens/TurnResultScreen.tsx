// src/screens/TurnResultScreen.tsx
// Tussenstand na elke beurt: het woord wordt onthuld en je ziet wie wat
// verdiend heeft.

import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { ref, onValue } from "firebase/database";
import { db } from "../../firebaseConfig";
import PlayerRow from "@/components/player-row";
import LeaveButton from "@/components/leave-button";
import { toRanking } from "@/logic/scoring";
import { useCountdown } from "@/hooks/use-server-time";
import { useSessionStore } from "@/hooks/use-session-store";
import { useRoomStore } from "@/hooks/use-room-store";
import { useLeaveRoom } from "@/hooks/use-leave-room";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import type { GuessedMap } from "@/types/game";

export default function TurnResultScreen() {
  const roomCode = useSessionStore((state) => state.code);
  const playerId = useSessionStore((state) => state.playerId);
  const isHost = useSessionStore((state) => state.isHost);
  const gameState = useRoomStore((state) => state.gameState);
  const players = useRoomStore((state) => state.players);
  const settings = useRoomStore((state) => state.settings);
  const onLeave = useLeaveRoom();

  const [guessed, setGuessed] = useState<GuessedMap>({});
  const msLeft = useCountdown(gameState?.phaseEndsAt);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!roomCode) return;
    const unsubscribe = onValue(
      ref(db, `rooms/${roomCode}/turn/guessed`),
      (snap) => setGuessed((snap.val() as GuessedMap | null) || {}),
    );
    return () => unsubscribe();
  }, [roomCode]);

  const drawerId = gameState?.currentDrawerId;
  const drawer = players?.[drawerId ?? ""];
  const guessCount = Object.keys(guessed).length;
  const drawerBonus = gameState?.lastDrawerBonus || 0;
  const ranking = toRanking(players);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
    >
      <LeaveButton isHost={isHost} onPress={onLeave} style={styles.leaveButton} />

      <ThemedText themeColor="textMuted" style={styles.label}>
        Het woord was
      </ThemedText>
      <ThemedText style={styles.word}>{gameState?.currentWord || "?"}</ThemedText>

      <ThemedText themeColor="success" style={styles.summary}>
        {guessCount === 0
          ? `Niemand heeft het geraden 😬`
          : `${guessCount} ${guessCount === 1 ? "speler" : "spelers"} geraden`}
        {drawer ? ` · ${drawer.name} kreeg +${drawerBonus}` : ""}
      </ThemedText>

      <FlashList
        data={ranking}
        keyExtractor={(player) => player.id}
        contentContainerStyle={styles.scrollContent}
        renderItem={({ item: player, index }) => {
          const entry = guessed[player.id];
          const gained =
            (entry?.points || 0) + (player.id === drawerId ? drawerBonus : 0);
          return (
            <PlayerRow
              player={player}
              rank={index}
              showScore
              gained={gained}
              isYou={player.id === playerId}
              isDrawer={player.id === drawerId}
            />
          );
        }}
      />

      <ThemedText themeColor="textDim" style={styles.next}>
        Ronde {gameState?.currentRound || 1}/{settings?.maxRounds || 3} ·
        Volgende beurt over {Math.ceil(msLeft / 1000)}s
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  leaveButton: { marginBottom: spacing.sm - 2 },
  label: {
    fontSize: 15,
    textAlign: "center",
  },
  word: {
    fontSize: 40,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 2,
    marginTop: spacing.xs,
  },
  summary: {
    fontSize: 15,
    textAlign: "center",
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  scrollContent: { paddingBottom: spacing.md - 2 },
  next: {
    fontSize: 14,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
