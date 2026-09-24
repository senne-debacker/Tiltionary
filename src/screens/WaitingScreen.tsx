// The waiting room. The host sets up and starts the game, and everyone can
// already chat.

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
import PlayerRow from "@/components/player-row";
import ChatPanel from "@/components/chat-panel";
import { WORD_PACKS, PACK_KEYS } from "@/data/words";
import {
  kickPlayer,
  updateSettings,
  startGame,
  sendChatMessage,
  DEFAULT_SETTINGS,
} from "@/logic/room";
import { radius, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSessionStore } from "@/hooks/use-session-store";
import { useRoomStore, useChatMessages } from "@/hooks/use-room-store";
import { useLeaveRoom } from "@/hooks/use-leave-room";
import { serverNow } from "@/hooks/use-server-time";
import { ThemedText } from "@/components/themed-text";
import type { WordPackKey } from "@/data/words";

/** Props for a row of options. `T` is a number for rounds and time, or a word pack key. */
type OptionRowProps<T extends string | number> = {
  label: string;
  options: readonly T[];
  value: T;
  onSelect: (value: T) => void;
  format?: (value: T) => string;
  disabled?: boolean;
};

const ROUND_OPTIONS = [1, 2, 3, 4, 5];
const TIMER_OPTIONS = [30, 45, 60, 90, 120];

function OptionRow<T extends string | number>({
  label,
  options,
  value,
  onSelect,
  format,
  disabled,
}: OptionRowProps<T>) {
  const theme = useTheme();

  return (
    <View style={styles.settingBlock}>
      <ThemedText style={styles.settingLabel}>{label}</ThemedText>
      <View style={styles.optionRow}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.option,
                { backgroundColor: theme.surfaceLighter },
                selected && {
                  backgroundColor: theme.primary,
                  borderColor: theme.primary,
                },
                disabled && styles.optionDisabled,
              ]}
              onPress={() => !disabled && onSelect(option)}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: selected ? "#FFFFFF" : theme.textMuted },
                ]}
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

export default function WaitingScreen() {
  const roomCode = useSessionStore((state) => state.code);
  const playerId = useSessionStore((state) => state.playerId);
  const nickname = useSessionStore((state) => state.nickname);
  const isHost = useSessionStore((state) => state.isHost);
  const players = useRoomStore((state) => state.players);
  const settings = useRoomStore((state) => state.settings);
  const onLeave = useLeaveRoom();
  const insets = useSafeAreaInsets();

  const activeSettings = settings || DEFAULT_SETTINGS;
  const playerList = Object.entries(players || {}).map(([id, p]) => ({
    id,
    ...p,
  }));

  const messages = useChatMessages();

  const handleSendChat = (text: string) =>
    sendChatMessage({ code: roomCode, playerId, name: nickname, text });

  const theme = useTheme();

  const patch = (change: Partial<typeof activeSettings>) =>
    updateSettings({ code: roomCode, patch: change });

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

  const confirmKick = (player: { id: string; name: string }) =>
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
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top + spacing.sm },
      ]}
    >
      <View style={styles.header}>
        <View>
          <ThemedText themeColor="textMuted" style={styles.codeLabel}>
            Kamercode
          </ThemedText>
          <ThemedText themeColor="primary" style={styles.code}>
            {roomCode}
          </ThemedText>
        </View>
        <TouchableOpacity
          onPress={onLeave}
          style={[styles.leaveButton, { backgroundColor: theme.surfaceLighter }]}
        >
          <ThemedText themeColor="danger" style={styles.leaveText}>
            {isHost ? "Sluiten" : "Verlaten"}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <ThemedText themeColor="textMuted" style={styles.sectionTitle}>
          Spelers ({playerList.length})
        </ThemedText>
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

        <ThemedText themeColor="textMuted" style={styles.sectionTitle}>
          Instellingen
        </ThemedText>
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
          // Firebase can hold any string, such as a pack from an older
          // version. pickWords falls back to the default pack in that case.
          value={activeSettings.wordPack as WordPackKey}
          onSelect={(value) => patch({ wordPack: value })}
          format={(key: WordPackKey) =>
            `${WORD_PACKS[key].emoji} ${WORD_PACKS[key].label}`
          }
          disabled={!isHost}
        />

        <View
          style={[
            styles.rules,
            { backgroundColor: theme.surfaceLight, borderColor: theme.success },
          ]}
        >
          <ThemedText themeColor="success" style={styles.rulesTitle}>
            📖 Spelregels
          </ThemedText>
          <ThemedText style={styles.rulesText}>
            • Elke speler tekent één keer per ronde.
          </ThemedText>
          <ThemedText style={styles.rulesText}>
            • Raden gaat via de chat: hoe sneller, hoe meer punten (tot 1000).
          </ThemedText>
          <ThemedText style={styles.rulesText}>
            • Top 3 snelste raders krijgen een bonus (+300 / +200 / +100).
          </ThemedText>
          <ThemedText style={styles.rulesText}>
            • De tekenaar krijgt 100 punten per speler die het raadt.
          </ThemedText>
        </View>
      </ScrollView>

      <View style={[styles.chatSection, { borderTopColor: theme.border }]}>
        <ThemedText themeColor="textMuted" style={styles.chatTitle}>
          💬 Chat
        </ThemedText>
        <ChatPanel
          messages={messages}
          onSend={handleSendChat}
          placeholder="Zeg hallo tegen de groep..."
        />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
        {isHost ? (
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: theme.primary }]}
            onPress={handleStart}
          >
            <Text style={styles.startText}>START SPEL</Text>
          </TouchableOpacity>
        ) : (
          <ThemedText themeColor="textMuted" style={styles.waitingText}>
            Wachten tot de host het spel start...
          </ThemedText>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  codeLabel: { fontSize: 13 },
  code: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 6,
  },
  leaveButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
  },
  leaveText: { fontWeight: "bold" },
  scroll: { flex: 1 },
  chatSection: { borderTopWidth: 1 },
  chatTitle: {
    fontSize: 13,
    fontWeight: "bold",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  settingBlock: { marginBottom: spacing.lg },
  settingLabel: { fontSize: 15, marginBottom: spacing.sm },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionDisabled: { opacity: 0.5 },
  optionText: { fontWeight: "600" },
  rules: {
    padding: spacing.lg + 2,
    borderRadius: radius.md,
    marginTop: spacing.xl,
    borderWidth: 1,
  },
  rulesTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: spacing.md,
  },
  rulesText: {
    fontSize: 14,
    marginBottom: spacing.sm - 2,
    lineHeight: 20,
  },
  footer: { padding: spacing.xl },
  startButton: {
    padding: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
  },
  startText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  waitingText: {
    fontSize: 16,
    fontStyle: "italic",
    textAlign: "center",
  },
});
