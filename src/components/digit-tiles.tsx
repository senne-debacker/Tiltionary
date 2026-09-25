// Characters in outlined tiles, like the countdown on the styleboard. Used
// for the room code and for countdowns.

import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  BRAND_COLORS,
  ON_COLOR,
  fonts,
  radius,
  spacing,
  stroke,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type DigitTilesProps = {
  value: string;
  /** Fills each tile with the next brand color instead of the surface. */
  colored?: boolean;
  size?: "md" | "lg";
  style?: StyleProp<ViewStyle>;
};

const SIZES = {
  md: { width: 48, height: 60, fontSize: 32 },
  lg: { width: 64, height: 84, fontSize: 48 },
};

export function DigitTiles({ value, colored = false, size = "md", style }: DigitTilesProps) {
  const theme = useTheme();
  const sizing = SIZES[size];

  return (
    <View style={[styles.row, style]}>
      {value.split("").map((char, index) => {
        const color = BRAND_COLORS[index % BRAND_COLORS.length];
        return (
          <View
            key={index}
            style={[
              styles.tile,
              {
                width: sizing.width,
                height: sizing.height,
                borderColor: theme.line,
                backgroundColor: colored ? theme[color] : theme.surface,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.digit,
                { fontSize: sizing.fontSize, lineHeight: sizing.fontSize * 1.15 },
                colored && { color: ON_COLOR[color] },
              ]}
            >
              {char}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm },
  tile: {
    borderWidth: stroke.regular,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  digit: { fontFamily: fonts.bold, fontVariant: ["tabular-nums"] },
});
