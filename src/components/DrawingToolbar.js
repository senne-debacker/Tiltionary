// src/components/DrawingToolbar.js
// Wis-alles en ongedaan-maken knoppen, plus (optioneel) een "klaar/delen"-knop
// voor de sandbox. Vervangt de oude schud-om-te-wissen gebaar: dat triggerde
// te makkelijk per ongeluk.

import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { colors, radius } from "../theme";

function ToolbarButton({ label, onPress, disabled, tone = "default" }) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        tone === "danger" && styles.buttonDanger,
        tone === "primary" && styles.buttonPrimary,
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, disabled && styles.textDisabled]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DrawingToolbar({ onUndo, canUndo, onClear, canClear, extra }) {
  return (
    <View style={styles.row}>
      <ToolbarButton label="↩ Ongedaan maken" onPress={onUndo} disabled={!canUndo} />
      <ToolbarButton
        label="🗑 Wis alles"
        onPress={onClear}
        disabled={!canClear}
        tone="danger"
      />
      {extra}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: colors.surface,
  },
  button: {
    flex: 1,
    backgroundColor: colors.surfaceLighter,
    paddingVertical: 12,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  buttonDanger: { backgroundColor: "rgba(255,59,48,0.18)" },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonDisabled: { opacity: 0.35 },
  text: { color: colors.text, fontWeight: "700", fontSize: 13 },
  textDisabled: { color: colors.textMuted },
});

export default React.memo(DrawingToolbar);
