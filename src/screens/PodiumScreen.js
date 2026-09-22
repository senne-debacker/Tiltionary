// src/screens/PodiumScreen.js
// Het eindscherm: podium met de top 3, daaronder de volledige stand.

import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import PlayerRow from "../components/PlayerRow";
import { toRanking } from "../logic/scoring";
import { playAgain } from "../logic/room";
import { colors, radius, spacing, shadow } from "../theme";

const PODIUM_ORDER = [1, 0, 2]; // zilver links, goud in het midden, brons rechts
const PODIUM_HEIGHTS = [110, 80, 60];
const PODIUM_COLORS = [colors.gold, colors.silver, colors.bronze];
const MEDALS = ["🥇", "🥈", "🥉"];

export default function PodiumScreen({
  roomCode,
  players,
  playerId,
  isHost,
  onLeave,
}) {
  const ranking = toRanking(players);
  const winner = ranking[0];

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏆 Eindstand</Text>
      {!!winner && (
        <Text style={styles.winner}>
          {winner.name} wint met {winner.score} punten!
        </Text>
      )}

      <View style={styles.podium}>
        {PODIUM_ORDER.map((rank) => {
          const player = ranking[rank];
          if (!player) return <View key={rank} style={styles.podiumSlot} />;
          return (
            <View key={rank} style={styles.podiumSlot}>
              <Text style={styles.podiumMedal}>{MEDALS[rank]}</Text>
              <Text style={styles.podiumName} numberOfLines={1}>
                {player.name}
              </Text>
              <Text style={styles.podiumScore}>{player.score}</Text>
              <View
                style={[
                  styles.podiumBlock,
                  {
                    height: PODIUM_HEIGHTS[rank],
                    backgroundColor: PODIUM_COLORS[rank],
                  },
                ]}
              />
            </View>
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {ranking.map((player, index) => (
          <PlayerRow
            key={player.id}
            player={player}
            rank={index}
            showScore
            isYou={player.id === playerId}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        {isHost ? (
          <TouchableOpacity
            style={styles.playAgain}
            onPress={() => playAgain({ code: roomCode, players })}
          >
            <Text style={styles.playAgainText}>NOG EEN KEER</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.waiting}>
            Wachten of de host nog een potje start...
          </Text>
        )}

        <TouchableOpacity style={styles.leave} onPress={onLeave}>
          <Text style={styles.leaveText}>
            {isHost ? "Kamer sluiten" : "Kamer verlaten"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 70,
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
  },
  winner: {
    color: colors.gold,
    fontSize: 17,
    textAlign: "center",
    marginTop: spacing.xs + 2,
  },
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    marginVertical: spacing.xl + 4,
    gap: spacing.sm,
  },
  podiumSlot: { flex: 1, alignItems: "center" },
  podiumMedal: { fontSize: 26 },
  podiumName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "bold",
    marginTop: spacing.xs - 2,
  },
  podiumScore: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm - 2 },
  podiumBlock: {
    width: "100%",
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.md - 2 },
  footer: { marginTop: spacing.md },
  playAgain: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    ...shadow.md,
  },
  playAgainText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  waiting: {
    color: colors.textMuted,
    fontSize: 15,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  leave: { padding: spacing.md + 2, alignItems: "center" },
  leaveText: { color: colors.danger, fontSize: 15, fontWeight: "600" },
});
