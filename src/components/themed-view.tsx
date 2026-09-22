// src/components/themed-view.tsx
// View met een achtergrondkleur uit het thema.

import { View, type ViewProps } from "react-native";

import type { ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ThemedViewProps = ViewProps & {
  /** Welke themakleur als achtergrond; standaard de schermachtergrond. */
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
