// src/screens/PodiumScreen.tsx
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
import PlayerRow from "@/components/player-row";
import { toRanking } from "@/logic/scoring";
import { playAgain } from "@/logic/room";
import { useSessionStore } from "@/hooks/use-session-store";
import { useRoomStore } from "@/hooks/use-room-store";
import { useLeaveRoom } from "@/hooks/use-leave-room";
import { radius, spacing, shadow } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ThemedText } from "@/components/themed-text";

const PODIUM_ORDER = [1, 0, 2]; // zilver links, goud in het midden, brons rechts
const PODIUM_HEIGHTS = [110, 80, 60];
const PODIUM_KEYS = ["gold", "silver", "bronze"] as const;
const MEDALS = ["🥇", "🥈", "🥉"];

export default function PodiumScreen() {
  const roomCode = useSessionStore((state) => state.code);
  const playerId = useSessionStore((state) => state.playerId);
  const isHost = useSessionStore((state) => state.isHost);
  const players = useRoomStore((state) => state.players);
  const onLeave = useLeaveRoom();

  const ranking = toRanking(players);
  const winner = ranking[0];
  const theme = useTheme();

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedText style={styles.title}>🏆 Eindstand</ThemedText>
      {!!winner && (
        <ThemedText themeColor="gold" style={styles.winner}>
          {winner.name} wint met {winner.score} punten!
        </ThemedText>
      )}

      <View style={styles.podium}>
        {PODIUM_ORDER.map((rank) => {
          const player = ranking[rank];
          if (!player) return <View key={rank} style={styles.podiumSlot} />;
          return (
            <View key={rank} style={styles.podiumSlot}>
              <ThemedText style={styles.podiumMedal}>{MEDALS[rank]}</ThemedText>
              <ThemedText style={styles.podiumName} numberOfLines={1}>
                {player.name}
              </ThemedText>
              <ThemedText themeColor="textMuted" style={styles.podiumScore}>
                {player.score}
              </ThemedText>
              <View
                style={[
                  styles.podiumBlock,
                  {
                    height: PODIUM_HEIGHTS[rank],
                    backgroundColor: theme[PODIUM_KEYS[rank]],
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
            style={[styles.playAgain, { backgroundColor: theme.primary }]}
            onPress={() => playAgain({ code: roomCode, players })}
          >
            <Text style={styles.playAgainText}>NOG EEN KEER</Text>
          </TouchableOpacity>
        ) : (
          <ThemedText themeColor="textMuted" style={styles.waiting}>
            Wachten of de host nog een potje start...
          </ThemedText>
        )}

        <TouchableOpacity style={styles.leave} onPress={onLeave}>
          <ThemedText themeColor="danger" style={styles.leaveText}>
            {isHost ? "Kamer sluiten" : "Kamer verlaten"}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
  },
  winner: {
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
    fontSize: 14,
    fontWeight: "bold",
    marginTop: spacing.xs - 2,
  },
  podiumScore: { fontSize: 13, marginBottom: spacing.sm - 2 },
  podiumBlock: {
    width: "100%",
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.md - 2 },
  footer: { marginTop: spacing.md },
  playAgain: {
    padding: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    ...shadow.md,
  },
  playAgainText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  waiting: {
    fontSize: 15,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  leave: { padding: spacing.md + 2, alignItems: "center" },
  leaveText: { fontSize: 15, fontWeight: "600" },
});
