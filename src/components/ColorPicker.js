// src/components/ColorPicker.js
// Rij kleurbolletjes waaruit de tekenaar de inktkleur kiest. Werkt meteen,
// ook midden in een lijn (zie de kleurwissel-logica in useTiltDrawing).

import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { INK_COLORS, colors, radius, spacing } from "../theme";

function ColorPicker({ value, onChange, disabled }) {
  return (
    <View
      style={[styles.row, disabled && styles.disabled]}
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
              selected && styles.swatchSelected,
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
    backgroundColor: colors.surface,
  },
  disabled: { opacity: 0.35 },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
  },
  swatchSelected: {
    borderColor: colors.text,
    transform: [{ scale: 1.15 }],
  },
});

export default React.memo(ColorPicker);
