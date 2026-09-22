// src/components/PlayerRow.js
import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { colors, radius } from "../theme";

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
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: radius.sm,
    marginBottom: 8,
  },
  rowYou: { borderWidth: 1, borderColor: colors.primary },
  left: { flexDirection: "row", alignItems: "center", flex: 1 },
  right: { flexDirection: "row", alignItems: "center" },
  rank: { fontSize: 16, marginRight: 10, color: colors.textMuted, width: 28 },
  name: { color: colors.text, fontSize: 17, fontWeight: "600", flexShrink: 1 },
  score: { color: colors.text, fontSize: 17, fontWeight: "bold", minWidth: 50, textAlign: "right" },
  gained: { color: colors.success, fontSize: 15, fontWeight: "bold", marginRight: 10 },
  kick: {
    backgroundColor: colors.danger,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  kickText: { color: colors.text, fontWeight: "bold", fontSize: 14 },
});
