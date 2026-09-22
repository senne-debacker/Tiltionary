// src/screens/WaitingScreen.js
// De wachtruimte. De host stelt hier het spel in en start het.

import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ref, onValue } from "firebase/database";
import { db } from "../../firebaseConfig";
import PlayerRow from "../components/PlayerRow";
import ChatPanel from "../components/ChatPanel";
import { WORD_PACKS, PACK_KEYS } from "../data/words";
import {
  kickPlayer,
  updateSettings,
  startGame,
  sendChatMessage,
  DEFAULT_SETTINGS,
} from "../logic/room";
import { colors, radius } from "../theme";

const ROUND_OPTIONS = [1, 2, 3, 4, 5];
const TIMER_OPTIONS = [30, 45, 60, 90, 120];

function OptionRow({ label, options, value, onSelect, format, disabled }) {
  return (
    <View style={styles.settingBlock}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.option,
                selected && styles.optionSelected,
                disabled && styles.optionDisabled,
              ]}
              onPress={() => !disabled && onSelect(option)}
              disabled={disabled}
            >
              <Text
                style={[styles.optionText, selected && styles.optionTextSelected]}
              >
                {format ? format(option) : option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function WaitingScreen({
  roomCode,
  playerId,
  nickname,
  isHost,
  players,
  settings,
  serverNow,
  onLeave,
}) {
  const activeSettings = settings || DEFAULT_SETTINGS;
  const playerList = Object.entries(players || {}).map(([id, p]) => ({
    id,
    ...p,
  }));

  const [chat, setChat] = useState({});
  useEffect(() => {
    if (!roomCode) return;
    const unsubscribe = onValue(ref(db, `rooms/${roomCode}/chat`), (snap) =>
      setChat(snap.val() || {}),
    );
    return () => unsubscribe();
  }, [roomCode]);

  const messages = useMemo(
    () =>
      Object.entries(chat)
        .map(([id, message]) => ({ id, ...message }))
        .sort((a, b) => (a.at || 0) - (b.at || 0)),
    [chat],
  );

  const handleSendChat = (text) =>
    sendChatMessage({ code: roomCode, playerId, name: nickname, text });

  const patch = (change) => updateSettings({ code: roomCode, patch: change });

  const handleStart = () => {
    if (playerList.length < 2) {
      return Alert.alert(
        "Nog niemand anders",
        "Je bent alleen in de kamer. Toch starten om te testen?",
        [
          { text: "Wachten", style: "cancel" },
          {
            text: "Starten",
            onPress: () =>
              startGame({ code: roomCode, players, settings: activeSettings, serverNow }),
          },
        ],
      );
    }
    startGame({ code: roomCode, players, settings: activeSettings, serverNow });
  };

  const confirmKick = (player) =>
    Alert.alert("Speler verwijderen", `${player.name} uit de kamer zetten?`, [
      { text: "Annuleren", style: "cancel" },
      {
        text: "Verwijderen",
        style: "destructive",
        onPress: () => kickPlayer({ code: roomCode, playerId: player.id }),
      },
    ]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.codeLabel}>Kamercode</Text>
          <Text style={styles.code}>{roomCode}</Text>
        </View>
        <TouchableOpacity onPress={onLeave} style={styles.leaveButton}>
          <Text style={styles.leaveText}>{isHost ? "Sluiten" : "Verlaten"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionTitle}>
          Spelers ({playerList.length})
        </Text>
        {playerList.map((player) => (
          <PlayerRow
            key={player.id}
            player={player}
            isYou={player.id === playerId}
            onKick={
              isHost && player.id !== playerId
                ? () => confirmKick(player)
                : undefined
            }
          />
        ))}

        <Text style={styles.sectionTitle}>Instellingen</Text>
        <OptionRow
          label="Aantal rondes"
          options={ROUND_OPTIONS}
          value={activeSettings.maxRounds}
          onSelect={(value) => patch({ maxRounds: value })}
          disabled={!isHost}
        />
        <OptionRow
          label="Tekentijd"
          options={TIMER_OPTIONS}
          value={activeSettings.timerSeconds}
          onSelect={(value) => patch({ timerSeconds: value })}
          format={(value) => `${value}s`}
          disabled={!isHost}
        />
        <OptionRow
          label="Woordpakket"
          options={PACK_KEYS}
          value={activeSettings.wordPack}
          onSelect={(value) => patch({ wordPack: value })}
          format={(key) => `${WORD_PACKS[key].emoji} ${WORD_PACKS[key].label}`}
          disabled={!isHost}
        />

        <View style={styles.rules}>
          <Text style={styles.rulesTitle}>📖 Spelregels</Text>
          <Text style={styles.rulesText}>
            • Elke speler tekent één keer per ronde.
          </Text>
          <Text style={styles.rulesText}>
            • Raden gaat via de chat: hoe sneller, hoe meer punten (tot 1000).
          </Text>
          <Text style={styles.rulesText}>
            • Top 3 snelste raders krijgen een bonus (+300 / +200 / +100).
          </Text>
          <Text style={styles.rulesText}>
            • De tekenaar krijgt 100 punten per speler die het raadt.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.chatSection}>
        <Text style={styles.chatTitle}>💬 Chat</Text>
        <ChatPanel
          messages={messages}
          onSend={handleSendChat}
          placeholder="Zeg hallo tegen de groep..."
        />
      </View>

      <View style={styles.footer}>
        {isHost ? (
          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Text style={styles.startText}>START SPEL</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.waitingText}>
            Wachten tot de host het spel start...
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  codeLabel: { color: colors.textMuted, fontSize: 13 },
  code: {
    color: colors.success,
    fontSize: 34,
    fontWeight: "bold",
    letterSpacing: 6,
  },
  leaveButton: {
    backgroundColor: colors.surfaceLighter,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  leaveText: { color: colors.danger, fontWeight: "bold" },
  scroll: { flex: 1 },
  chatSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chatTitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "bold",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 10,
  },
  settingBlock: { marginBottom: 16 },
  settingLabel: { color: colors.text, fontSize: 15, marginBottom: 8 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: {
    backgroundColor: colors.surfaceLighter,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionDisabled: { opacity: 0.5 },
  optionText: { color: colors.textMuted, fontWeight: "600" },
  optionTextSelected: { color: colors.text },
  rules: {
    backgroundColor: colors.surfaceLight,
    padding: 18,
    borderRadius: radius.md,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.success,
  },
  rulesTitle: {
    color: colors.success,
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 10,
  },
  rulesText: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  footer: { padding: 20, paddingBottom: 40 },
  startButton: {
    backgroundColor: colors.primary,
    padding: 20,
    borderRadius: radius.md,
    alignItems: "center",
  },
  startText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  waitingText: {
    color: colors.textMuted,
    fontSize: 16,
    fontStyle: "italic",
    textAlign: "center",
  },
});
