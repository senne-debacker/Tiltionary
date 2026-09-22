// src/components/LeaveButton.js
// Consistente "verlaat/beëindig spel"-knop voor op elk scherm tijdens een
// lopend potje. Het bevestigingsdialoogje zit al in de meegegeven onPress
// (App.js' handleLeave) — dit component is puur de knop zelf.

import React from "react";
import { StyleSheet, TouchableOpacity, Text } from "react-native";
import { colors, radius, spacing } from "../theme";

export default function LeaveButton({ isHost, onPress, style }) {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <Text style={styles.text}>{isHost ? "Spel beëindigen" : "Verlaten"}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(251,75,75,0.15)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
  },
  text: { color: colors.danger, fontWeight: "700", fontSize: 12 },
});
