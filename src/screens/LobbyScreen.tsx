// src/screens/LobbyScreen.tsx
// Startscherm: naam kiezen, kamer maken of joinen.

import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { createRoom, joinRoom, cleanupStaleRooms } from "@/logic/room";
import { radius, spacing, shadow } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSessionStore } from "@/hooks/use-session-store";
import { ThemedText } from "@/components/themed-text";
import { Collapsible } from "@/components/collapsible";

const DRAWING_STEPS = [
  "Tik om het balletje te laten vallen",
  "Kantel om te rollen en te tekenen",
  "Tik om je pen op te tillen",
  "Kies een kleur boven het tekenvlak",
  "Gebruik de knoppen om ongedaan te maken of alles te wissen",
];

// Handgetekend lijntje onder de titel — dezelfde balletjes-en-lijnen-taal als
// het spel zelf, i.p.v. een generieke rechte streep.
function Squiggle({ stroke, dot }: { stroke: string; dot: string }) {
  return (
    <Svg width={220} height={26} viewBox="0 0 220 26" style={styles.squiggle}>
      <Path
        d="M4,18 C 34,4 54,28 84,14 C 114,0 134,24 164,12 C 180,6 190,10 198,14"
        stroke={stroke}
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={206} cy={15} r={7} fill={dot} />
    </Svg>
  );
}

export default function LobbyScreen({ onSandbox }: { onSandbox: () => void }) {
  const setSession = useSessionStore((state) => state.setSession);
  const [nameInput, setNameInput] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const theme = useTheme();

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
      // Draait op de achtergrond: mag het maken van de kamer niet vertragen,
      // en als het mislukt is dat geen probleem — de volgende poging ruimt op.
      cleanupStaleRooms().catch(() => {});

      const { code, playerId } = await createRoom({ name });
      setSession({ code, playerId, nickname: name, isHost: true });
    } catch (error) {
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
      setSession({
        code: joinCode,
        playerId,
        nickname: name,
        isHost: false,
      });
    } catch (error) {
      Alert.alert("Fout", "Kon geen verbinding maken.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <ThemedText style={styles.title}>
            Tilt<ThemedText style={[styles.title, { color: theme.primary }]}>ionary</ThemedText>
          </ThemedText>
          <Squiggle stroke={theme.accent} dot={theme.primary} />
          <ThemedText themeColor="textMuted" style={styles.subtitle}>
            Teken met je telefoon, raad met je hoofd
          </ThemedText>
        </View>

        <TextInput
          style={[
            styles.nameInput,
            { backgroundColor: theme.surfaceLighter, color: theme.text, borderColor: theme.border },
            nameFocused && { borderColor: theme.primary },
          ]}
          placeholder="Kies je nickname"
          placeholderTextColor={theme.textDim}
          maxLength={12}
          value={nameInput}
          onChangeText={setNameInput}
          onFocus={() => setNameFocused(true)}
          onBlur={() => setNameFocused(false)}
          autoCapitalize="words"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.bigButton, { backgroundColor: theme.primary }, busy && styles.busy]}
          onPress={handleCreate}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Maak een kamer</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <ThemedText themeColor="textDim" style={styles.dividerLabel}>of</ThemedText>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        <View style={styles.joinRow}>
          <TextInput
            style={[
              styles.codeInput,
              { backgroundColor: theme.surfaceLighter, color: theme.text },
            ]}
            placeholder="Code"
            placeholderTextColor={theme.textDim}
            keyboardType="number-pad"
            maxLength={4}
            value={joinCode}
            onChangeText={setJoinCode}
          />
          <TouchableOpacity
            style={[styles.joinButton, { backgroundColor: theme.success }, busy && styles.busy]}
            onPress={handleJoin}
            disabled={busy}
          >
            <Text style={styles.buttonText}>Join</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.sandboxButton, { borderColor: theme.border }]}
          onPress={onSandbox}
        >
          <ThemedText themeColor="textMuted" style={styles.sandboxText}>
            🎨 Sandbox (oefenen)
          </ThemedText>
        </TouchableOpacity>

        <View style={styles.help}>
          <Collapsible title="Hoe werkt het tekenen?">
            <ThemedText style={styles.helpIntro}>Hou je telefoon plat.</ThemedText>
            {DRAWING_STEPS.map((step) => (
              <ThemedText key={step} themeColor="textMuted" style={styles.helpStep}>
                • {step}
              </ThemedText>
            ))}
          </Collapsible>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  hero: { alignItems: "center", marginBottom: spacing.xxl },
  title: { fontSize: 44, fontWeight: "800" },
  squiggle: { marginTop: 2 },
  subtitle: { fontSize: 15, marginTop: spacing.sm },
  nameInput: {
    fontSize: 22,
    padding: spacing.lg,
    borderRadius: radius.md,
    width: "100%",
    textAlign: "center",
    borderWidth: 2,
  },
  bigButton: {
    padding: spacing.lg,
    borderRadius: radius.md,
    width: "100%",
    alignItems: "center",
    marginTop: spacing.md,
    ...shadow.md,
  },
  busy: { opacity: 0.6 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerLabel: { fontSize: 13, fontWeight: "600" },
  joinRow: { flexDirection: "row", width: "100%" },
  codeInput: {
    flex: 1,
    fontSize: 22,
    padding: spacing.lg,
    borderRadius: radius.md,
    textAlign: "center",
    marginRight: spacing.sm,
    letterSpacing: 4,
  },
  joinButton: {
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
    width: 100,
  },
  buttonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  sandboxButton: {
    borderWidth: 2,
    padding: spacing.md + 2,
    borderRadius: radius.md,
    width: "100%",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  sandboxText: { fontSize: 16, fontWeight: "700" },
  help: { width: "100%", marginTop: spacing.lg },
  helpIntro: { fontSize: 15, fontWeight: "600", marginBottom: spacing.xs },
  helpStep: { fontSize: 14, lineHeight: 20 },
});
