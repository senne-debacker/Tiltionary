// Home screen: pick a name, create or join a room, and turn sound on or off.

import { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createRoom, joinRoom, cleanupStaleRooms } from "@/logic/room";
import { fonts, radius, spacing, stroke } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSessionStore } from "@/hooks/use-session-store";
import { useSettingsStore } from "@/hooks/use-settings-store";
import { CodeLabel, ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { BrandShapes } from "@/components/brand-shapes";
import { Collapsible } from "@/components/collapsible";

const DRAWING_STEPS = [
  "Tik om het balletje te laten vallen",
  "Kantel om te rollen en te tekenen",
  "Tik om je pen op te tillen",
  "Kies een kleur boven het tekenvlak",
  "Gebruik de knoppen om ongedaan te maken of alles te wissen",
];

export default function LobbyScreen({ onSandbox }: { onSandbox: () => void }) {
  const setSession = useSessionStore((state) => state.setSession);
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const toggleSound = useSettingsStore((state) => state.toggleSound);
  const [nameInput, setNameInput] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const validName = () => {
    const name = nameInput.trim();
    if (name.length < 2) {
      Alert.alert("Bijna!", "Vul een naam in van minstens 2 letters.");
      return null;
    }
    return name;
  };

  const handleCreate = async () => {
    const name = validName();
    if (!name || busy) return;

    setBusy(true);
    try {
      // Runs in the background so it never slows down creating a room. A
      // failure is fine, because the next new room cleans up again.
      cleanupStaleRooms().catch(() => {});

      const { code, playerId } = await createRoom({ name });
      setSession({ code, playerId, nickname: name, isHost: true });
    } catch {
      Alert.alert("Fout", "Kon de kamer niet aanmaken. Check je internet.");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    const name = validName();
    if (!name || busy) return;
    if (joinCode.length !== 4) {
      return Alert.alert("Bijna!", "Vul een code van 4 cijfers in.");
    }

    setBusy(true);
    try {
      const { playerId, error } = await joinRoom({ code: joinCode, name });
      if (error || !playerId) {
        return Alert.alert("Oeps!", error ?? "Kon de kamer niet joinen.");
      }
      setSession({ code: joinCode, playerId, nickname: name, isHost: false });
    } catch {
      Alert.alert("Fout", "Kon geen verbinding maken.");
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.surface, color: theme.text, borderColor: theme.line },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <CodeLabel>teken · kantel · raad</CodeLabel>
          <Button
            icon={
              soundEnabled
                ? { ios: "speaker.wave.2.fill", android: "volume_up" }
                : { ios: "speaker.slash.fill", android: "volume_off" }
            }
            variant={soundEnabled ? "filled" : "outline"}
            color="yellow"
            size="sm"
            onPress={toggleSound}
            accessibilityLabel={soundEnabled ? "Geluid uitzetten" : "Geluid aanzetten"}
          />
        </View>

        <View style={styles.hero}>
          <BrandShapes width={width - spacing.xl * 2} />
          <ThemedText type="display" style={styles.title}>
            Tiltionary
          </ThemedText>
        </View>

        <View style={styles.field}>
          <CodeLabel>jouw naam</CodeLabel>
          <TextInput
            style={inputStyle}
            placeholder="Kies een nickname"
            placeholderTextColor={theme.textDim}
            maxLength={12}
            value={nameInput}
            onChangeText={setNameInput}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        <Button
          label="Maak een kamer"
          icon={{ ios: "plus", android: "add" }}
          size="lg"
          onPress={handleCreate}
          loading={busy}
        />

        <View style={styles.field}>
          <CodeLabel>of join met een code</CodeLabel>
          <View style={styles.joinRow}>
            <TextInput
              style={[inputStyle, styles.codeInput]}
              placeholder="0000"
              placeholderTextColor={theme.textDim}
              keyboardType="number-pad"
              maxLength={4}
              value={joinCode}
              onChangeText={setJoinCode}
            />
            <Button
              label="Join"
              icon={{ ios: "arrow.right", android: "arrow_forward" }}
              color="green"
              size="lg"
              onPress={handleJoin}
              disabled={busy}
            />
          </View>
        </View>

        <Button
          label="Oefenen in de sandbox"
          icon={{ ios: "paintbrush.pointed.fill", android: "brush" }}
          variant="outline"
          onPress={onSandbox}
        />

        <Collapsible title="Hoe werkt het tekenen?">
          <ThemedText type="smallStrong">Hou je telefoon plat.</ThemedText>
          {DRAWING_STEPS.map((step, index) => (
            <View key={step} style={styles.step}>
              <View style={[styles.stepNumber, { borderColor: theme.line }]}>
                <ThemedText type="code">{index + 1}</ThemedText>
              </View>
              <ThemedText type="small" themeColor="textMuted" style={styles.stepText}>
                {step}
              </ThemedText>
            </View>
          ))}
        </Collapsible>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hero: { gap: spacing.sm, marginBottom: spacing.xs },
  title: { marginTop: spacing.md },
  field: { gap: spacing.sm },
  input: {
    height: 56,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: stroke.regular,
    fontFamily: fonts.medium,
    fontSize: 18,
    // iOS spaces out placeholder letters in a custom font unless this is set.
    letterSpacing: 0,
  },
  joinRow: { flexDirection: "row", gap: spacing.sm },
  codeInput: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: 8,
  },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: stroke.thin,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { flex: 1 },
});
