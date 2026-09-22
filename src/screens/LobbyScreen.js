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
import { createRoom, joinRoom, cleanupStaleRooms } from "../logic/room";
import { colors, radius } from "../theme";

export default function LobbyScreen({ onEnterRoom, onSandbox }) {
  const [nameInput, setNameInput] = useState("");
  const [joinCode, setJoinCode] = useState("");
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
      // Oude, vergeten kamers opruimen. Op de achtergrond: het mag het maken
      // van een nieuwe kamer niet vertragen, en als het mislukt is dat niet erg.
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
      <Text style={styles.title}>Tiltionary</Text>
      <Text style={styles.subtitle}>Teken met je telefoon, raad met je hoofd</Text>

      <TextInput
        style={styles.nameInput}
        placeholder="Kies je nickname"
        placeholderTextColor={colors.textDim}
        maxLength={12}
        value={nameInput}
        onChangeText={setNameInput}
        autoCapitalize="words"
        autoCorrect={false}
      />

      <View style={styles.divider} />

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

      <View style={styles.divider} />

      <TouchableOpacity style={styles.sandboxButton} onPress={onSandbox}>
        <Text style={styles.buttonText}>Sandbox (oefenen)</Text>
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
    padding: 20,
  },
  title: { color: colors.text, fontSize: 40, fontWeight: "bold" },
  subtitle: { color: colors.textMuted, fontSize: 15, marginBottom: 30 },
  nameInput: {
    backgroundColor: colors.surfaceLighter,
    color: colors.text,
    fontSize: 24,
    padding: 15,
    borderRadius: radius.md,
    width: "100%",
    textAlign: "center",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  bigButton: {
    backgroundColor: colors.primary,
    padding: 20,
    borderRadius: radius.md,
    width: "100%",
    alignItems: "center",
  },
  sandboxButton: {
    backgroundColor: colors.textMuted,
    padding: 18,
    borderRadius: radius.md,
    width: "100%",
    alignItems: "center",
  },
  busy: { opacity: 0.6 },
  joinRow: { flexDirection: "row", width: "100%", marginTop: 12 },
  codeInput: {
    flex: 1,
    backgroundColor: colors.surfaceLighter,
    color: colors.text,
    fontSize: 24,
    padding: 15,
    borderRadius: radius.md,
    textAlign: "center",
    marginRight: 10,
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
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  infoButton: { marginTop: 24, padding: 10 },
  infoText: { color: colors.primary, fontSize: 15 },
});
