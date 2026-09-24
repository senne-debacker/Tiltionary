// Shown briefly while the first snapshot of the room arrives.

import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

export default function LoadingRoute() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={theme.primary} size="large" />
      <Text style={[styles.text, { color: theme.textMuted }]}>
        Kamer laden...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { marginTop: 12, fontSize: 15 },
});
