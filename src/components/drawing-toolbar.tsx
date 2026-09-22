// src/components/drawing-toolbar.tsx
// Wis-alles en ongedaan-maken knoppen. Vervangt het oude schud-om-te-wissen
// gebaar: dat triggerde te makkelijk per ongeluk.

import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { radius, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { ReactNode } from "react";

type ToolbarButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "default" | "danger" | "primary";
};

type DrawingToolbarProps = {
  onUndo: () => void;
  canUndo: boolean;
  onClear: () => void;
  canClear: boolean;
  extra?: ReactNode;
};

function ToolbarButton({
  label,
  onPress,
  disabled,
  tone = "default",
}: ToolbarButtonProps) {
  const theme = useTheme();

  const background =
    tone === "primary"
      ? theme.primary
      : tone === "danger"
        ? theme.surfaceLighter
        : theme.surfaceLighter;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: background },
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.text,
          { color: tone === "danger" ? theme.danger : theme.text },
          disabled && { color: theme.textMuted },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function DrawingToolbar({
  onUndo,
  canUndo,
  onClear,
  canClear,
  extra,
}: DrawingToolbarProps) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { backgroundColor: theme.surface }]}>
      <ToolbarButton
        label="↩ Ongedaan maken"
        onPress={onUndo}
        disabled={!canUndo}
      />
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
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.xs,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.35 },
  text: { fontWeight: "700", fontSize: 13 },
});

export default React.memo(DrawingToolbar);
