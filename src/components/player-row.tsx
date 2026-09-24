// One row in a player list: the name, plus an optional medal, score and
// kick button.

import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { radius, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ThemedText } from "@/components/themed-text";
import type { Player } from "@/types/game";

const MEDALS = ["🥇", "🥈", "🥉"];

type PlayerRowProps = {
  player: Player;
  /** Zero-based position. The top three get a medal. */
  rank?: number;
  showScore?: boolean;
  /** Points this player just earned. */
  gained?: number;
  isYou?: boolean;
  isDrawer?: boolean;
  onKick?: () => void;
};

export default function PlayerRow({
  player,
  rank,
  showScore = false,
  gained,
  isYou = false,
  isDrawer = false,
  onKick,
}: PlayerRowProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: theme.surfaceLighter },
        isYou && { borderWidth: 1, borderColor: theme.primary },
      ]}
    >
      <View style={styles.left}>
        {rank !== undefined && (
          <ThemedText themeColor="textMuted" style={styles.rank}>
            {MEDALS[rank] || `${rank + 1}.`}
          </ThemedText>
        )}
        <ThemedText style={styles.name} numberOfLines={1}>
          {player.name}
          {player.isHost ? " 👑" : ""}
          {isDrawer ? " ✏️" : ""}
          {isYou ? " (jij)" : ""}
        </ThemedText>
      </View>

      <View style={styles.right}>
        {!!gained && gained > 0 && (
          <ThemedText themeColor="success" style={styles.gained}>
            +{gained}
          </ThemedText>
        )}
        {showScore && (
          <ThemedText style={styles.score}>{player.score || 0}</ThemedText>
        )}
        {!!onKick && (
          <TouchableOpacity
            onPress={onKick}
            style={[styles.kick, { backgroundColor: theme.danger }]}
          >
            <ThemedText style={styles.kickText}>✕</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg - 1,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  left: { flexDirection: "row", alignItems: "center", flex: 1 },
  right: { flexDirection: "row", alignItems: "center" },
  rank: { fontSize: 16, marginRight: spacing.sm + 2, width: 28 },
  name: { fontSize: 17, fontWeight: "600", flexShrink: 1 },
  score: { fontSize: 17, fontWeight: "bold", minWidth: 50, textAlign: "right" },
  gained: { fontSize: 15, fontWeight: "bold", marginRight: spacing.sm + 2 },
  kick: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.md,
  },
  kickText: { fontWeight: "bold", fontSize: 14, color: "#FFFFFF" },
});
