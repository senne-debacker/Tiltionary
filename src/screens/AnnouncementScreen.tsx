// src/screens/AnnouncementScreen.tsx
// "Speler X tekent!" — 5 seconden lang, zodat iedereen weet wie aan de beurt is.

import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Text, Animated, Easing } from "react-native";
import * as Haptics from "expo-haptics";
import { useCountdown } from "@/hooks/use-server-time";
import { useSessionStore } from "@/hooks/use-session-store";
import { useRoomStore } from "@/hooks/use-room-store";
import { useLeaveRoom } from "@/hooks/use-leave-room";
import LeaveButton from "@/components/leave-button";
import { radius, spacing, shadow } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";

export default function AnnouncementScreen() {
  const playerId = useSessionStore((state) => state.playerId);
  const isHost = useSessionStore((state) => state.isHost);
  const gameState = useRoomStore((state) => state.gameState);
  const players = useRoomStore((state) => state.players);
  const settings = useRoomStore((state) => state.settings);
  const onLeave = useLeaveRoom();

  const msLeft = useCountdown(gameState?.phaseEndsAt);
  const drawer = players?.[gameState?.currentDrawerId ?? ""];
  const isYou = gameState?.currentDrawerId === playerId;
  const scale = useRef(new Animated.Value(0.7)).current;
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [gameState?.currentDrawerId, scale]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LeaveButton
        isHost={isHost}
        onPress={onLeave}
        style={[styles.leaveButton, { top: insets.top + spacing.sm }]}
      />

      <ThemedText themeColor="textMuted" style={styles.round}>
        Ronde {gameState?.currentRound || 1} van {settings?.maxRounds || 3}
      </ThemedText>

      <Animated.View
        style={[
          styles.card,
          { backgroundColor: theme.surfaceLight, borderColor: theme.primary },
          { transform: [{ scale }] },
        ]}
      >
        <Text style={styles.emoji}>✏️</Text>
        <ThemedText style={styles.name}>{drawer?.name || "Speler"}</ThemedText>
        <ThemedText themeColor="primary" style={styles.action}>
          {isYou ? "Jij tekent!" : "is aan het tekenen!"}
        </ThemedText>
      </Animated.View>

      <ThemedText themeColor="textMuted" style={styles.hint}>
        {isYou
          ? "Maak je klaar, je mag zo een woord kiezen."
          : "Hou de chat in de gaten en raad zo snel mogelijk."}
      </ThemedText>

      <ThemedText themeColor="textDim" style={styles.countdown}>
        {Math.ceil(msLeft / 1000)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl,
  },
  leaveButton: { position: "absolute", right: spacing.xl },
  round: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing.xxl,
  },
  card: {
    paddingVertical: 40,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.lg,
    alignItems: "center",
    width: "100%",
    borderWidth: 2,
    ...shadow.md,
  },
  emoji: { fontSize: 56, marginBottom: spacing.md },
  name: { fontSize: 34, fontWeight: "bold" },
  action: { fontSize: 20, marginTop: spacing.xs + 2 },
  hint: {
    fontSize: 15,
    textAlign: "center",
    marginTop: spacing.xxl,
  },
  countdown: {
    fontSize: 60,
    fontWeight: "bold",
    marginTop: spacing.xl,
  },
});
