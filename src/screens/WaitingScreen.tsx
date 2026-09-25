// The waiting room. The host sets up and starts the game, and everyone can
// already chat.

import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PlayerRow from "@/components/player-row";
import ChatPanel from "@/components/chat-panel";
import LeaveButton from "@/components/leave-button";
import { Button } from "@/components/button";
import { DigitTiles } from "@/components/digit-tiles";
import { CodeLabel, ThemedText } from "@/components/themed-text";
import { WORD_PACKS, PACK_KEYS, type WordPackKey } from "@/data/words";
import {
  kickPlayer,
  updateSettings,
  startGame,
  sendChatMessage,
  DEFAULT_SETTINGS,
} from "@/logic/room";
import {
  BRAND_COLORS,
  ON_COLOR,
  radius,
  spacing,
  stroke,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSessionStore } from "@/hooks/use-session-store";
import { useRoomStore, useChatMessages } from "@/hooks/use-room-store";
import { useLeaveRoom } from "@/hooks/use-leave-room";
import { serverNow } from "@/hooks/use-server-time";

/** Props for a row of options. `T` is a number for rounds and time, or a word pack key. */
type OptionRowProps<T extends string | number> = {
  label: string;
  options: readonly T[];
  value: T;
  onSelect: (value: T) => void;
  format?: (value: T) => string;
  /** Optional colored dot in front of an option. */
  dot?: (value: T) => string;
  disabled?: boolean;
};

const ROUND_OPTIONS = [1, 2, 3, 4, 5];
const TIMER_OPTIONS = [30, 45, 60, 90, 120];
const RULES = [
  "Elke speler tekent één keer per ronde.",
  "Raden gaat via de chat: hoe sneller, hoe meer punten, tot 1000.",
  "De drie snelste raders krijgen een bonus van 300, 200 en 100.",
  "De tekenaar krijgt 100 punten per speler die het raadt.",
];

function OptionRow<T extends string | number>({
  label,
  options,
  value,
  onSelect,
  format,
  dot,
  disabled,
}: OptionRowProps<T>) {
  const theme = useTheme();

  return (
    <View style={styles.settingBlock}>
      <ThemedText type="smallStrong">{label}</ThemedText>
      <View style={styles.optionRow}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              style={[
                styles.option,
                {
                  borderColor: theme.line,
                  backgroundColor: selected ? theme.text : theme.surface,
                },
                disabled && !selected && styles.optionDisabled,
              ]}
              onPress={() => onSelect(option)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
            >
              {dot && (
                <View
                  style={[styles.dot, { backgroundColor: dot(option), borderColor: theme.line }]}
                />
              )}
              <ThemedText
                type="smallStrong"
                style={{ color: selected ? theme.background : theme.text }}
              >
                {format ? format(option) : option}
              </ThemedText>
            </Pressable>
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
  const messages = useChatMessages();
  const onLeave = useLeaveRoom();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const activeSettings = settings || DEFAULT_SETTINGS;
  const playerList = Object.entries(players).map(([id, p]) => ({ id, ...p }));

  const handleSendChat = (text: string) =>
    sendChatMessage({ code: roomCode, playerId, name: nickname, text });

  const patch = (change: Partial<typeof activeSettings>) =>
    updateSettings({ code: roomCode, patch: change });

  const start = () =>
    startGame({ code: roomCode, players, settings: activeSettings, serverNow });

  const handleStart = () => {
    if (playerList.length >= 2) return start();
    Alert.alert("Nog niemand anders", "Je bent alleen in de kamer. Toch starten?", [
      { text: "Wachten", style: "cancel" },
      { text: "Starten", onPress: start },
    ]);
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
      style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <CodeLabel>kamercode</CodeLabel>
          <DigitTiles value={roomCode} colored />
        </View>
        <LeaveButton isHost={isHost} onPress={onLeave} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <CodeLabel style={styles.sectionTitle}>{`spelers (${playerList.length})`}</CodeLabel>
        {playerList.map((player) => (
          <PlayerRow
            key={player.id}
            player={player}
            isYou={player.id === playerId}
            onKick={isHost && player.id !== playerId ? () => confirmKick(player) : undefined}
          />
        ))}

        <CodeLabel style={styles.sectionTitle}>
          {isHost ? "instellingen" : "instellingen van de host"}
        </CodeLabel>
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
          format={(key) => WORD_PACKS[key].label}
          dot={(key) => theme[WORD_PACKS[key].color]}
          disabled={!isHost}
        />

        <View style={[styles.rules, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <ThemedText type="heading">Spelregels</ThemedText>
          {RULES.map((rule, index) => {
            const color = BRAND_COLORS[index % BRAND_COLORS.length];
            return (
              <View key={rule} style={styles.rule}>
                <View
                  style={[styles.ruleNumber, { backgroundColor: theme[color], borderColor: theme.line }]}
                >
                  <ThemedText type="code" style={{ color: ON_COLOR[color] }}>
                    {index + 1}
                  </ThemedText>
                </View>
                <ThemedText type="small" style={styles.ruleText}>
                  {rule}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <ChatPanel
        messages={messages}
        onSend={handleSendChat}
        placeholder="Zeg hallo tegen de groep..."
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {isHost ? (
          <Button
            label="Start het spel"
            icon={{ ios: "play.fill", android: "play_arrow" }}
            size="lg"
            onPress={handleStart}
          />
        ) : (
          <CodeLabel style={styles.waitingText}>wachten tot de host start...</CodeLabel>
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
    alignItems: "flex-start",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerText: { gap: spacing.sm },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  sectionTitle: { marginTop: spacing.md, marginBottom: spacing.md },
  settingBlock: { marginBottom: spacing.lg, gap: spacing.sm },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    height: 38,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
    borderWidth: stroke.regular,
  },
  optionDisabled: { opacity: 0.45 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: stroke.thin },
  rules: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: stroke.regular,
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  rule: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  ruleNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: stroke.regular,
    alignItems: "center",
    justifyContent: "center",
  },
  ruleText: { flex: 1 },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  waitingText: { textAlign: "center", paddingVertical: spacing.md },
});
