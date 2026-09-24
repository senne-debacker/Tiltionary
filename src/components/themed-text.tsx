// Text that takes its color from the theme and its size from a fixed type
// scale, so font sizes live in one place.

import { StyleSheet, Text, type TextProps } from "react-native";

import type { ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ThemedTextProps = TextProps & {
  type?:
    | "default"
    | "hero"
    | "title"
    | "subtitle"
    | "small"
    | "smallBold"
    | "label";
  themeColor?: ThemeColor;
};

export function ThemedText({
  style,
  type = "default",
  themeColor,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? "text"] },
        styles[type],
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  hero: { fontSize: 44, fontWeight: "800" },
  title: { fontSize: 32, fontWeight: "bold" },
  subtitle: { fontSize: 20, fontWeight: "600" },
  default: { fontSize: 16, fontWeight: "500" },
  small: { fontSize: 14 },
  smallBold: { fontSize: 14, fontWeight: "700" },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
  },
});
