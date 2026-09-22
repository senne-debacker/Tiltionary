// src/components/TimerBar.js
// Voortgangsbalk voor de beurttimer: groen -> amber -> rood naarmate de tijd
// opraakt.

import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { colors } from "../theme";

function TimerBar({ msLeft, totalMs, label }) {
  const seconds = Math.ceil(msLeft / 1000);
  const ratio = totalMs > 0 ? Math.max(0, Math.min(1, msLeft / totalMs)) : 0;
  const color =
    ratio > 0.5 ? colors.success : ratio > 0.2 ? colors.warning : colors.danger;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {!!label && <Text style={styles.label}>{label}</Text>}
        <Text style={[styles.seconds, { color }]}>{seconds}s</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${ratio * 100}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  seconds: { fontSize: 15, fontWeight: "bold" },
  track: {
    height: 6,
    backgroundColor: colors.surfaceLighter,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 3 },
});

export default React.memo(TimerBar);
