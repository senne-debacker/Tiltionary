// src/components/leave-button.tsx
// Consistente "verlaat/beëindig spel"-knop voor op elk scherm tijdens een
// lopend potje. Het bevestigingsdialoogje zit al in de meegegeven onPress
// (zie handleLeave) — dit component is puur de knop zelf.

import React from "react";
import { StyleSheet, TouchableOpacity, Text } from "react-native";
import { radius, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { StyleProp, ViewStyle } from "react-native";

type LeaveButtonProps = {
  isHost: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function LeaveButton({
  isHost,
  onPress,
  style,
}: LeaveButtonProps) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: theme.surfaceLighter }, style]}
      onPress={onPress}
    >
      <Text style={[styles.text, { color: theme.danger }]}>
        {isHost ? "Spel beëindigen" : "Verlaten"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "flex-end",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
  },
  text: { fontWeight: "700", fontSize: 12 },
});
