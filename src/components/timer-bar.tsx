// Progress bar for the turn timer. It turns from green to yellow to red as
// time runs out.

import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { fonts, spacing, stroke } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type TimerBarProps = {
  msLeft: number;
  totalMs?: number;
};

function TimerBar({ msLeft, totalMs = 0 }: TimerBarProps) {
  const theme = useTheme();
  const seconds = Math.ceil(msLeft / 1000);
  const ratio = totalMs > 0 ? Math.max(0, Math.min(1, msLeft / totalMs)) : 0;
  const color = ratio > 0.5 ? theme.green : ratio > 0.2 ? theme.yellow : theme.red;

  return (
    <View style={styles.row}>
      <View style={[styles.track, { borderColor: theme.line, backgroundColor: theme.surface }]}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
      <ThemedText style={styles.seconds}>{seconds}s</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  track: {
    flex: 1,
    height: 14,
    borderRadius: 7,
    borderWidth: stroke.regular,
    overflow: "hidden",
  },
  fill: { height: "100%" },
  seconds: { fontFamily: fonts.mono, fontSize: 14, minWidth: 36, textAlign: "right" },
});

export default TimerBar;
