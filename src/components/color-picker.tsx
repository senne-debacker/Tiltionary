// src/components/color-picker.tsx
// Rij kleurbolletjes waaruit de tekenaar de inktkleur kiest. Werkt meteen,
// ook midden in een lijn (zie de kleurwissel-logica in use-tilt-drawing).

import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { INK_COLORS, radius, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
};

function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: theme.surface },
        disabled && styles.disabled,
      ]}
      pointerEvents={disabled ? "none" : "auto"}
    >
      {INK_COLORS.map((color) => {
        const selected = color === value;
        return (
          <TouchableOpacity
            key={color}
            onPress={() => onChange(color)}
            style={[
              styles.swatch,
              { backgroundColor: color },
              selected && [styles.swatchSelected, { borderColor: theme.text }],
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  disabled: { opacity: 0.35 },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
  },
  swatchSelected: { transform: [{ scale: 1.15 }] },
});

export default ColorPicker;
