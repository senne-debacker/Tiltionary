// src/screens/AnnouncementScreen.js
// "Speler X tekent!" — 5 seconden lang, zodat iedereen weet wie aan de beurt is.

import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Text, Animated, Easing } from "react-native";
import * as Haptics from "expo-haptics";
import { useCountdown } from "../hooks/useServerTime";
import LeaveButton from "../components/LeaveButton";
import { colors, radius, spacing, shadow } from "../theme";

export default function AnnouncementScreen({
  gameState,
  players,
  playerId,
  isHost,
  onLeave,
  settings,
  serverNow,
}) {
  const msLeft = useCountdown(gameState?.phaseEndsAt, serverNow);
  const drawer = players?.[gameState?.currentDrawerId];
  const isYou = gameState?.currentDrawerId === playerId;
  const scale = useRef(new Animated.Value(0.7)).current;

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
    <View style={styles.container}>
      <LeaveButton isHost={isHost} onPress={onLeave} style={styles.leaveButton} />

      <Text style={styles.round}>
        Ronde {gameState?.currentRound || 1} van {settings?.maxRounds || 3}
      </Text>

      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <Text style={styles.emoji}>✏️</Text>
        <Text style={styles.name}>{drawer?.name || "Speler"}</Text>
        <Text style={styles.action}>
          {isYou ? "Jij tekent!" : "is aan het tekenen!"}
        </Text>
      </Animated.View>

      <Text style={styles.hint}>
        {isYou
          ? "Maak je klaar, je mag zo een woord kiezen."
          : "Hou de chat in de gaten en raad zo snel mogelijk."}
      </Text>

      <Text style={styles.countdown}>{Math.ceil(msLeft / 1000)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl,
  },
  leaveButton: { position: "absolute", top: 55, right: spacing.xl },
  round: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: 40,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.lg,
    alignItems: "center",
    width: "100%",
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadow.md,
  },
  emoji: { fontSize: 56, marginBottom: spacing.md },
  name: { color: colors.text, fontSize: 34, fontWeight: "bold" },
  action: { color: colors.primary, fontSize: 20, marginTop: spacing.xs + 2 },
  hint: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: "center",
    marginTop: spacing.xxl,
  },
  countdown: {
    color: colors.textDim,
    fontSize: 60,
    fontWeight: "bold",
    marginTop: spacing.xl,
  },
});
