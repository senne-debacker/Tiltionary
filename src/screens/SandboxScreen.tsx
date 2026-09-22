// src/screens/SandboxScreen.js
// Vrij tekenen om de besturing onder de knie te krijgen. Geen Firebase.
// Kan de tekening ook opslaan in de fotobibliotheek of delen.

import React, { useCallback, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import DrawingCanvas from "../components/DrawingCanvas";
import ColorPicker from "../components/ColorPicker";
import DrawingToolbar from "../components/DrawingToolbar";
import useTiltDrawing from "../hooks/useTiltDrawing";
import { saveDrawingToLibrary, shareDrawing } from "../logic/exportDrawing";
import { colors, radius, spacing, shadow, INK_COLORS } from "../theme";

export default function SandboxScreen({ onExit }) {
  useKeepAwake();

  const [inkColor, setInkColor] = useState(INK_COLORS[0]);
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const svgRef = useRef(null);
  const canvasSize = useRef(null);

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

  const onCanvasLayout = useCallback(
    (event) => {
      handleLayout(event);
      const { width, height } = event.nativeEvent.layout;
      canvasSize.current = { width, height };
    },
    [handleLayout],
  );

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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sandbox</Text>
        <TouchableOpacity
          style={[styles.finishButton, !hasDrawing && styles.finishButtonDisabled]}
          onPress={() => setShowExport(true)}
          disabled={!hasDrawing}
        >
          <Text style={styles.finishText}>Klaar ✓</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exitButton} onPress={onExit}>
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

      <Text style={styles.tip}>Kantel om te rollen · Tik om je pen op te tillen</Text>

      {showExport && (
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Mooi getekend! 🎨</Text>
            <Text style={styles.sheetSub}>Wat wil je ermee doen?</Text>

            {exporting ? (
              <ActivityIndicator color={colors.primary} style={styles.spinner} />
            ) : (
              <>
                <TouchableOpacity style={styles.sheetButton} onPress={handleSave}>
                  <Text style={styles.sheetButtonText}>📷 Opslaan in Foto's</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetButton} onPress={handleShare}>
                  <Text style={styles.sheetButtonText}>📤 Delen</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.sheetClose}
              onPress={() => setShowExport(false)}
              disabled={exporting}
            >
              <Text style={styles.sheetCloseText}>Terug naar tekenen</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: spacing.md + 3,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    gap: spacing.sm + 2,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: "bold", flex: 1 },
  finishButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md + 3,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  finishButtonDisabled: { opacity: 0.35 },
  finishText: { color: colors.text, fontWeight: "bold" },
  exitButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.md + 3,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  actionText: { color: colors.text, fontWeight: "bold" },
  tip: {
    color: colors.textDim,
    fontSize: 12,
    textAlign: "center",
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    padding: spacing.xl + 6,
    width: "100%",
    alignItems: "center",
    ...shadow.md,
  },
  sheetTitle: { color: colors.text, fontSize: 22, fontWeight: "bold" },
  sheetSub: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  sheetButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg - 1,
    borderRadius: radius.md,
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sheetButtonText: { color: colors.text, fontSize: 16, fontWeight: "bold" },
  spinner: { marginVertical: spacing.xl },
  sheetClose: { marginTop: spacing.xs + 2, padding: spacing.sm + 2 },
  sheetCloseText: { color: colors.textMuted, fontSize: 14 },
});
