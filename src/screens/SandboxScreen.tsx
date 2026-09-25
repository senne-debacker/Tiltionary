// Free drawing to practise the controls, without Firebase. The drawing can
// be saved or shared as a photo or as a GIF of how it was drawn.

import { useRef, useState } from "react";
import { StyleSheet, View, Pressable, Alert, ActivityIndicator } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DrawingCanvas from "@/components/drawing-canvas";
import ColorPicker from "@/components/color-picker";
import DrawingToolbar from "@/components/drawing-toolbar";
import { Button } from "@/components/button";
import { CodeLabel, ThemedText } from "@/components/themed-text";
import useTiltDrawing from "@/hooks/use-tilt-drawing";
import {
  saveDrawing,
  shareDrawing,
  type ExportFormat,
} from "@/logic/export-drawing";
import { radius, spacing, stroke } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { LayoutChangeEvent } from "react-native";

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "png", label: "Foto" },
  { value: "gif", label: "GIF" },
];

export default function SandboxScreen({ onExit }: { onExit: () => void }) {
  useKeepAwake();

  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("png");
  const svgRef = useRef(null);
  const canvasSize = useRef<{ width: number; height: number } | null>(null);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const {
    paths,
    position,
    drawState,
    isPenLifted,
    color: inkColor,
    setColor: setInkColor,
    canUndo,
    handleTouchStart,
    handleTouchEnd,
    handleLayout,
    clear,
    undo,
  } = useTiltDrawing({ enabled: true });

  const onCanvasLayout = (event: LayoutChangeEvent) => {
    handleLayout(event);
    const { width, height } = event.nativeEvent.layout;
    canvasSize.current = { width, height };
  };

  const hasDrawing = paths.length > 0;
  const exportSource = () => ({ svgRef, paths, canvasSize: canvasSize.current });

  const handleSave = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await saveDrawing(format, exportSource());
      if (result.ok) {
        Alert.alert("Opgeslagen!", "Je tekening staat in je fotobibliotheek.");
      } else if (result.reason === "permission") {
        Alert.alert(
          "Geen toestemming",
          "Geef Tiltionary toegang om foto's op te slaan via je instellingen.",
        );
      }
    } catch {
      Alert.alert("Oeps!", "Opslaan is niet gelukt. Probeer het nog eens.");
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await shareDrawing(format, exportSource());
      if (!result.ok && result.reason === "unavailable") {
        Alert.alert("Niet beschikbaar", "Delen wordt niet ondersteund op dit toestel.");
      }
    } catch {
      Alert.alert("Oeps!", "Delen is niet gelukt. Probeer het nog eens.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerText}>
          <CodeLabel>oefenen</CodeLabel>
          <ThemedText type="title">Sandbox</ThemedText>
        </View>
        <Button
          label="Klaar"
          icon={{ ios: "checkmark", android: "check" }}
          color="green"
          size="sm"
          onPress={() => setShowExport(true)}
          disabled={!hasDrawing}
        />
        <Button
          icon={{ ios: "xmark", android: "close" }}
          variant="outline"
          size="sm"
          onPress={onExit}
          accessibilityLabel="Sandbox sluiten"
        />
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
        hint={drawState === "waiting" ? "tik om het balletje te laten vallen" : undefined}
      />

      <DrawingToolbar onUndo={undo} canUndo={canUndo} onClear={clear} canClear={hasDrawing} />

      <CodeLabel style={[styles.tip, { paddingBottom: insets.bottom + spacing.md }]}>
        kantel om te rollen · tik om je pen op te tillen
      </CodeLabel>

      {showExport && (
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <CodeLabel>klaar met tekenen</CodeLabel>
            <ThemedText type="title">Mooi getekend!</ThemedText>
            <ThemedText themeColor="textMuted" style={styles.sheetSub}>
              Bewaar je tekening als foto, of als GIF van hoe ze ontstond.
            </ThemedText>

            <View style={[styles.formatRow, { borderColor: theme.line }]}>
              {FORMATS.map((option) => {
                const selected = option.value === format;
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.formatOption, selected && { backgroundColor: theme.text }]}
                    onPress={() => setFormat(option.value)}
                    disabled={exporting}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <ThemedText
                      type="smallStrong"
                      style={{ color: selected ? theme.background : theme.text }}
                    >
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {exporting ? (
              <View style={styles.spinner}>
                <ActivityIndicator color={theme.blue} />
                {format === "gif" && <CodeLabel>gif maken...</CodeLabel>}
              </View>
            ) : (
              <View style={styles.actions}>
                <Button
                  label="Opslaan in Foto's"
                  icon={{ ios: "square.and.arrow.down", android: "download" }}
                  onPress={handleSave}
                />
                <Button
                  label="Delen"
                  icon={{ ios: "square.and.arrow.up", android: "share" }}
                  color="yellow"
                  onPress={handleShare}
                />
              </View>
            )}

            <Button
              label="Terug naar tekenen"
              variant="outline"
              onPress={() => setShowExport(false)}
              disabled={exporting}
            />
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
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  headerText: { flex: 1 },
  tip: { textAlign: "center", paddingTop: spacing.md, paddingHorizontal: spacing.xl },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(31,31,31,0.6)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  sheet: {
    borderRadius: radius.lg,
    borderWidth: stroke.regular,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  sheetSub: { marginBottom: spacing.sm },
  formatRow: {
    flexDirection: "row",
    borderWidth: stroke.regular,
    borderRadius: radius.pill,
    padding: 3,
    marginBottom: spacing.sm,
  },
  formatOption: {
    flex: 1,
    height: 38,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  actions: { gap: spacing.sm },
});
