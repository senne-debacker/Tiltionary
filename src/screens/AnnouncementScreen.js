// src/screens/AnnouncementScreen.js
// "Speler X tekent!" — 5 seconden lang, zodat iedereen weet wie aan de beurt is.

import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Text, Animated, Easing } from "react-native";
import * as Haptics from "expo-haptics";
import { useCountdown } from "../hooks/useServerTime";
import LeaveButton from "../components/LeaveButton";
import { colors } from "../theme";

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
    padding: 30,
  },
  leaveButton: { position: "absolute", top: 55, right: 20 },
  round: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 30,
  },
  card: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: 40,
    paddingHorizontal: 30,
    borderRadius: 24,
    alignItems: "center",
    width: "100%",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  emoji: { fontSize: 56, marginBottom: 12 },
  name: { color: colors.text, fontSize: 34, fontWeight: "bold" },
  action: { color: colors.primary, fontSize: 20, marginTop: 6 },
  hint: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: "center",
    marginTop: 30,
  },
  countdown: {
    color: colors.textDim,
    fontSize: 60,
    fontWeight: "bold",
    marginTop: 20,
  },
});
