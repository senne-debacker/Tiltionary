// View with a background color from the theme, and an optional outlined card
// style used for most panels in the app.

import { StyleSheet, View, type ViewProps } from "react-native";

import { radius, stroke, type ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ThemedViewProps = ViewProps & {
  /** Theme color for the background. Defaults to the screen background. */
  type?: ThemeColor;
  /** Draws the outline and rounded corners of a card. */
  card?: boolean;
};

export function ThemedView({ style, type, card = false, ...rest }: ThemedViewProps) {
  const theme = useTheme();
  const background = type ?? (card ? "surface" : "background");

  return (
    <View
      style={[
        { backgroundColor: theme[background] },
        card && [styles.card, { borderColor: theme.line }],
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: stroke.regular, borderRadius: radius.lg },
});
