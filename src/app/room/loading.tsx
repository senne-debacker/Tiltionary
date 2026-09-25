// Shown briefly while the first snapshot of the room arrives.

import { ActivityIndicator, StyleSheet, View } from "react-native";

import { CodeLabel } from "@/components/themed-text";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export default function LoadingRoute() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={theme.blue} size="large" />
      <CodeLabel>kamer laden...</CodeLabel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
});
