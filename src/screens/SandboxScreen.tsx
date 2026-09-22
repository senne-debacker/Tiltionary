// src/screens/SandboxScreen.tsx
// Vrij tekenen om de besturing onder de knie te krijgen. Geen Firebase.
// Kan de tekening ook opslaan in de fotobibliotheek of delen.

import { useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import DrawingCanvas from "@/components/drawing-canvas";
import ColorPicker from "@/components/color-picker";
import DrawingToolbar from "@/components/drawing-toolbar";
import useTiltDrawing from "@/hooks/use-tilt-drawing";
import { saveDrawingToLibrary, shareDrawing } from "@/logic/export-drawing";
import { radius, spacing, shadow, INK_COLORS } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import type { LayoutChangeEvent } from "react-native";

export default function SandboxScreen({ onExit }: { onExit: () => void }) {
  useKeepAwake();

  const [inkColor, setInkColor] = useState(INK_COLORS[0]);
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const svgRef = useRef(null);
  const canvasSize = useRef<{ width: number; height: number } | null>(null);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const {
    paths,
    position,
    drawState,
    isPenLifted,
    canUndo,
    handleTouchStart,
    handleTouchEnd,
    handleLayout,
    clear,
    undo,
  } = useTiltDrawing({ enabled: true, color: inkColor });

  const onCanvasLayout = (event: LayoutChangeEvent) => {
    handleLayout(event);
    const { width, height } = event.nativeEvent.layout;
    canvasSize.current = { width, height };
  };

  const hasDrawing = paths.length > 0;

  const handleSave = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await saveDrawingToLibrary(svgRef, canvasSize.current);
      if (result.ok) {
        Alert.alert("Opgeslagen!", "Je tekening staat in je fotobibliotheek.");
      } else if (result.reason === "permission") {
        Alert.alert(
          "Geen toestemming",
          "Geef Tiltionary toegang om foto's op te slaan via je instellingen.",
        );
      }
    } catch (error) {
      Alert.alert("Oeps!", "Opslaan is niet gelukt. Probeer het nog eens.");
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await shareDrawing(svgRef, canvasSize.current);
      if (!result.ok && result.reason === "unavailable") {
        Alert.alert("Niet beschikbaar", "Delen wordt niet ondersteund op dit toestel.");
      }
    } catch (error) {
      Alert.alert("Oeps!", "Delen is niet gelukt. Probeer het nog eens.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.surface, paddingTop: insets.top + spacing.sm },
        ]}
      >
        <ThemedText style={styles.title}>Sandbox</ThemedText>
        <TouchableOpacity
          style={[
            styles.finishButton,
            { backgroundColor: theme.success },
            !hasDrawing && styles.finishButtonDisabled,
          ]}
          onPress={() => setShowExport(true)}
          disabled={!hasDrawing}
        >
          <Text style={styles.finishText}>Klaar ✓</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exitButton, { backgroundColor: theme.danger }]}
          onPress={onExit}
        >
          <Text style={styles.actionText}>Stop</Text>
        </TouchableOpacity>
      </View>

      <ColorPicker value={inkColor} onChange={setInkColor} />

      <DrawingCanvas
        ref={svgRef}
        paths={paths}
        position={position}
        showBall={drawState === "drawing"}
        isPenLifted={isPenLifted}
        ballColor={inkColor}
        interactive
        onLayout={onCanvasLayout}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        hint={
          drawState === "waiting"
            ? "Tik om het balletje te laten vallen"
            : undefined
        }
      />

      <DrawingToolbar
        onUndo={undo}
        canUndo={canUndo}
        onClear={clear}
        canClear={hasDrawing}
      />

      <ThemedText
        themeColor="textDim"
        style={[styles.tip, { backgroundColor: theme.surface }]}
      >
        Kantel om te rollen · Tik om je pen op te tillen
      </ThemedText>

      {showExport && (
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: theme.surfaceLight }]}>
            <ThemedText style={styles.sheetTitle}>Mooi getekend! 🎨</ThemedText>
            <ThemedText themeColor="textMuted" style={styles.sheetSub}>
              Wat wil je ermee doen?
            </ThemedText>

            {exporting ? (
              <ActivityIndicator color={theme.primary} style={styles.spinner} />
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.sheetButton, { backgroundColor: theme.primary }]}
                  onPress={handleSave}
                >
                  <Text style={styles.sheetButtonText}>📷 Opslaan in Foto's</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sheetButton, { backgroundColor: theme.primary }]}
                  onPress={handleShare}
                >
                  <Text style={styles.sheetButtonText}>📤 Delen</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.sheetClose}
              onPress={() => setShowExport(false)}
              disabled={exporting}
            >
              <ThemedText themeColor="textMuted" style={styles.sheetCloseText}>
                Terug naar tekenen
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: spacing.md + 3,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm + 2,
  },
  title: { fontSize: 20, fontWeight: "bold", flex: 1 },
  finishButton: {
    paddingHorizontal: spacing.md + 3,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  finishButtonDisabled: { opacity: 0.35 },
  finishText: { color: "#FFFFFF", fontWeight: "bold" },
  exitButton: {
    paddingHorizontal: spacing.md + 3,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  actionText: { color: "#FFFFFF", fontWeight: "bold" },
  tip: {
    fontSize: 12,
    textAlign: "center",
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(13,10,23,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl,
  },
  sheet: {
    borderRadius: radius.lg,
    padding: spacing.xl + 6,
    width: "100%",
    alignItems: "center",
    ...shadow.md,
  },
  sheetTitle: { fontSize: 22, fontWeight: "bold" },
  sheetSub: {
    fontSize: 14,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  sheetButton: {
    paddingVertical: spacing.lg - 1,
    borderRadius: radius.md,
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sheetButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  spinner: { marginVertical: spacing.xl },
  sheetClose: { marginTop: spacing.xs + 2, padding: spacing.sm + 2 },
  sheetCloseText: { fontSize: 14 },
});
