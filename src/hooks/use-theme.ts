// src/hooks/use-theme.ts
// Geeft het kleurenpalet dat past bij de systeeminstelling van de gebruiker.

import { useColorScheme } from "react-native";
import { Colors, type Theme } from "@/constants/theme";

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return Colors[scheme === "light" ? "light" : "dark"];
}
