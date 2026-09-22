// src/screens/TurnResultScreen.js
// Tussenstand na elke beurt: het woord wordt onthuld en je ziet wie wat
// verdiend heeft.

import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, ScrollView } from "react-native";
import { ref, onValue } from "firebase/database";
import { db } from "../../firebaseConfig";
import PlayerRow from "../components/PlayerRow";
import LeaveButton from "../components/LeaveButton";
import { toRanking } from "../logic/scoring";
import { useCountdown } from "../hooks/useServerTime";
import { colors } from "../theme";

export default function TurnResultScreen({
  roomCode,
  gameState,
  players,
  playerId,
  isHost,
  onLeave,
  settings,
  serverNow,
}) {
  const [guessed, setGuessed] = useState({});
  const msLeft = useCountdown(gameState?.phaseEndsAt, serverNow);

  useEffect(() => {
    if (!roomCode) return;
    const unsubscribe = onValue(
      ref(db, `rooms/${roomCode}/turn/guessed`),
      (snap) => setGuessed(snap.val() || {}),
    );
    return () => unsubscribe();
  }, [roomCode]);

  const drawerId = gameState?.currentDrawerId;
  const drawer = players?.[drawerId];
  const guessCount = Object.keys(guessed).length;
  const drawerBonus = gameState?.lastDrawerBonus || 0;
  const ranking = toRanking(players);

  return (
    <View style={styles.container}>
      <LeaveButton isHost={isHost} onPress={onLeave} style={styles.leaveButton} />

      <Text style={styles.label}>Het woord was</Text>
      <Text style={styles.word}>{gameState?.currentWord || "?"}</Text>

      <Text style={styles.summary}>
        {guessCount === 0
          ? `Niemand heeft het geraden 😬`
          : `${guessCount} ${guessCount === 1 ? "speler" : "spelers"} geraden`}
        {drawer ? ` · ${drawer.name} kreeg +${drawerBonus}` : ""}
      </Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {ranking.map((player, index) => {
          const entry = guessed[player.id];
          const gained =
            (entry?.points || 0) + (player.id === drawerId ? drawerBonus : 0);
          return (
            <PlayerRow
              key={player.id}
              player={player}
              rank={index}
              showScore
              gained={gained}
              isYou={player.id === playerId}
              isDrawer={player.id === drawerId}
            />
          );
        })}
      </ScrollView>

      <Text style={styles.next}>
        Ronde {gameState?.currentRound || 1}/{settings?.maxRounds || 3} ·
        Volgende beurt over {Math.ceil(msLeft / 1000)}s
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  leaveButton: { marginBottom: 6 },
  label: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: "center",
  },
  word: {
    color: colors.text,
    fontSize: 40,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 2,
    marginTop: 4,
  },
  summary: {
    color: colors.success,
    fontSize: 15,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 10 },
  next: {
    color: colors.textDim,
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
  },
});
