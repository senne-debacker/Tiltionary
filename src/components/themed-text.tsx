// Text that takes its color from the theme and its font from a fixed type
// scale, so font sizes and families live in one place.

import { StyleSheet, Text, type TextProps } from "react-native";

import { fonts, type ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ThemedTextProps = TextProps & {
  type?:
    | "display"
    | "title"
    | "heading"
    | "default"
    | "strong"
    | "small"
    | "smallStrong"
    | "code";
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
      style={[{ color: theme[themeColor ?? "text"] }, styles[type], style]}
      {...rest}
    />
  );
}

/** Monospace label in the "// label" style of the styleboard. */
export function CodeLabel({ children, style, ...rest }: Omit<ThemedTextProps, "type">) {
  return (
    <ThemedText type="code" themeColor="textMuted" style={style} {...rest}>
      {"// "}
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  display: { fontFamily: fonts.bold, fontSize: 44, lineHeight: 48, letterSpacing: -1.2 },
  title: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 27, letterSpacing: -0.2 },
  default: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  strong: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  smallStrong: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  code: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
});
