// Row of color swatches for the ink. A change applies right away, even in
// the middle of a line (see setColor in use-tilt-drawing).

import { Pressable, StyleSheet, View } from "react-native";
import { INK_COLORS, spacing, stroke } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

function ColorPicker({ value, onChange }: ColorPickerProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {INK_COLORS.map((color) => {
        const selected = color === value;
        return (
          <Pressable
            key={color}
            onPress={() => onChange(color)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.ring, { borderColor: selected ? theme.line : "transparent" }]}
          >
            <View
              style={[styles.swatch, { backgroundColor: color, borderColor: theme.line }]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  ring: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: stroke.bold,
    alignItems: "center",
    justifyContent: "center",
  },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: stroke.regular },
});

export default ColorPicker;
