// src/screens/LobbyScreen.js
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
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { createRoom, joinRoom, cleanupStaleRooms } from "../logic/room";
import { colors, radius, spacing, shadow } from "../theme";

// Handgetekend lijntje onder de titel — dezelfde balletjes-en-lijnen-taal als
// het spel zelf, i.p.v. een generieke rechte streep.
function Squiggle() {
  return (
    <Svg
      width={220}
      height={26}
      viewBox="0 0 220 26"
      style={styles.squiggle}
    >
      <Path
        d="M4,18 C 34,4 54,28 84,14 C 114,0 134,24 164,12 C 180,6 190,10 198,14"
        stroke={colors.accent}
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={206} cy={15} r={7} fill={colors.primary} />
    </Svg>
  );
}

export default function LobbyScreen({ onEnterRoom, onSandbox }) {
  const [nameInput, setNameInput] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [busy, setBusy] = useState(false);

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
      onEnterRoom({ code, playerId, name, isHost: true });
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
      if (error) return Alert.alert("Oeps!", error);
      onEnterRoom({ code: joinCode, playerId, name, isHost: false });
    } catch (error) {
      Alert.alert("Fout", "Kon geen verbinding maken.");
    } finally {
      setBusy(false);
    }
  };

  const showHelp = () =>
    Alert.alert(
      "Hoe werkt het tekenen?",
      "Hou je telefoon plat.\n\n• Tik om het balletje te laten vallen\n• Kantel om te rollen en te tekenen\n• Tik om je pen op te tillen\n• Kies een kleur onderaan\n• Gebruik de knoppen om ongedaan te maken of alles te wissen",
    );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.hero}>
        <Text style={styles.title}>
          Tilt<Text style={styles.titleAccent}>ionary</Text>
        </Text>
        <Squiggle />
        <Text style={styles.subtitle}>
          Teken met je telefoon, raad met je hoofd
        </Text>
      </View>

      <TextInput
        style={[styles.nameInput, nameFocused && styles.nameInputFocused]}
        placeholder="Kies je nickname"
        placeholderTextColor={colors.textDim}
        maxLength={12}
        value={nameInput}
        onChangeText={setNameInput}
        onFocus={() => setNameFocused(true)}
        onBlur={() => setNameFocused(false)}
        autoCapitalize="words"
        autoCorrect={false}
      />

      <TouchableOpacity
        style={[styles.bigButton, busy && styles.busy]}
        onPress={handleCreate}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>Maak een kamer</Text>
        )}
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>of</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.joinRow}>
        <TextInput
          style={styles.codeInput}
          placeholder="Code"
          placeholderTextColor={colors.textDim}
          keyboardType="number-pad"
          maxLength={4}
          value={joinCode}
          onChangeText={setJoinCode}
        />
        <TouchableOpacity
          style={[styles.joinButton, busy && styles.busy]}
          onPress={handleJoin}
          disabled={busy}
        >
          <Text style={styles.buttonText}>Join</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.sandboxButton} onPress={onSandbox}>
        <Text style={styles.sandboxText}>🎨 Sandbox (oefenen)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.infoButton} onPress={showHelp}>
        <Text style={styles.infoText}>ℹ️ Hoe werkt het tekenen?</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  hero: { alignItems: "center", marginBottom: spacing.xxl },
  title: { color: colors.text, fontSize: 44, fontWeight: "800" },
  titleAccent: { color: colors.primary },
  squiggle: { marginTop: 2 },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: spacing.sm,
  },
  nameInput: {
    backgroundColor: colors.surfaceLighter,
    color: colors.text,
    fontSize: 22,
    padding: spacing.lg,
    borderRadius: radius.md,
    width: "100%",
    textAlign: "center",
    borderWidth: 2,
    borderColor: colors.border,
  },
  nameInputFocused: { borderColor: colors.primary },
  bigButton: {
    backgroundColor: colors.primary,
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
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerLabel: { color: colors.textDim, fontSize: 13, fontWeight: "600" },
  joinRow: { flexDirection: "row", width: "100%" },
  codeInput: {
    flex: 1,
    backgroundColor: colors.surfaceLighter,
    color: colors.text,
    fontSize: 22,
    padding: spacing.lg,
    borderRadius: radius.md,
    textAlign: "center",
    marginRight: spacing.sm,
    letterSpacing: 4,
  },
  joinButton: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
    width: 100,
  },
  buttonText: { color: colors.text, fontSize: 18, fontWeight: "bold" },
  sandboxButton: {
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md + 2,
    borderRadius: radius.md,
    width: "100%",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  sandboxText: { color: colors.textMuted, fontSize: 16, fontWeight: "700" },
  infoButton: { marginTop: spacing.xl, padding: spacing.sm },
  infoText: { color: colors.primary, fontSize: 15 },
});
