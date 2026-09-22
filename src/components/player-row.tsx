// src/components/PlayerRow.js
// Eén rij in een spelerslijst: naam, eventueel medaille/score/kick-knop.

import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { colors, radius, spacing } from "../theme";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function PlayerRow({
  player,
  rank, // 0-based; toont een medaille bij de top 3
  showScore = false,
  gained, // punten die deze speler net verdiend heeft
  isYou = false,
  isDrawer = false,
  onKick,
}) {
  return (
    <View style={[styles.row, isYou && styles.rowYou]}>
      <View style={styles.left}>
        {rank !== undefined && (
          <Text style={styles.rank}>{MEDALS[rank] || `${rank + 1}.`}</Text>
        )}
        <Text style={styles.name} numberOfLines={1}>
          {player.name}
          {player.isHost ? " 👑" : ""}
          {isDrawer ? " ✏️" : ""}
          {isYou ? " (jij)" : ""}
        </Text>
      </View>

      <View style={styles.right}>
        {gained > 0 && <Text style={styles.gained}>+{gained}</Text>}
        {showScore && <Text style={styles.score}>{player.score || 0}</Text>}
        {!!onKick && (
          <TouchableOpacity onPress={onKick} style={styles.kick}>
            <Text style={styles.kickText}>✕</Text>
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
    backgroundColor: colors.surfaceLighter,
    paddingHorizontal: spacing.lg - 1,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  rowYou: { borderWidth: 1, borderColor: colors.primary },
  left: { flexDirection: "row", alignItems: "center", flex: 1 },
  right: { flexDirection: "row", alignItems: "center" },
  rank: { fontSize: 16, marginRight: spacing.sm + 2, color: colors.textMuted, width: 28 },
  name: { color: colors.text, fontSize: 17, fontWeight: "600", flexShrink: 1 },
  score: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "bold",
    minWidth: 50,
    textAlign: "right",
  },
  gained: {
    color: colors.success,
    fontSize: 15,
    fontWeight: "bold",
    marginRight: spacing.sm + 2,
  },
  kick: {
    backgroundColor: colors.danger,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.md,
  },
  kickText: { color: colors.text, fontWeight: "bold", fontSize: 14 },
});
