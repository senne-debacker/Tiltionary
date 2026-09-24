// Returns the color palette that matches the system theme.

import { useColorScheme } from "react-native";
import { Colors, type Theme } from "@/constants/theme";

/** Returns the light or dark palette. */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  return Colors[scheme === "light" ? "light" : "dark"];
}
