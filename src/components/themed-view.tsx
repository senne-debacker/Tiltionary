// View with a background color from the theme.

import { View, type ViewProps } from "react-native";

import type { ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ThemedViewProps = ViewProps & {
  /** Theme color for the background. Defaults to the screen background. */
  type?: ThemeColor;
};

export function ThemedView({ style, type, ...rest }: ThemedViewProps) {
  const theme = useTheme();

  return (
    <View
      style={[{ backgroundColor: theme[type ?? "background"] }, style]}
      {...rest}
    />
  );
}
