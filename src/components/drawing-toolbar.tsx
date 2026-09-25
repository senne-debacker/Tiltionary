// Undo and clear buttons below the canvas. They replace a shake-to-clear
// gesture that fired too easily by accident.

import { StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type DrawingToolbarProps = {
  onUndo: () => void;
  canUndo: boolean;
  onClear: () => void;
  canClear: boolean;
};

function DrawingToolbar({ onUndo, canUndo, onClear, canClear }: DrawingToolbarProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <Button
        label="Ongedaan maken"
        icon={{ ios: "arrow.uturn.backward", android: "undo" }}
        variant="outline"
        size="sm"
        onPress={onUndo}
        disabled={!canUndo}
        style={styles.button}
      />
      <Button
        label="Wis alles"
        icon={{ ios: "trash", android: "delete" }}
        variant="outline"
        tint={theme.redText}
        size="sm"
        onPress={onClear}
        disabled={!canClear}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  button: { flex: 1 },
});

export default DrawingToolbar;
