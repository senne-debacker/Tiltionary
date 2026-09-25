// Standings after each turn: reveals the word on a ticket-style card and
// shows who earned what.

import { StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PlayerRow from "@/components/player-row";
import LeaveButton from "@/components/leave-button";
import { CodeLabel, ThemedText } from "@/components/themed-text";
import { toRanking } from "@/logic/scoring";
import { useCountdown } from "@/hooks/use-server-time";
import { useSessionStore } from "@/hooks/use-session-store";
import { useRoomStore } from "@/hooks/use-room-store";
import { useLeaveRoom } from "@/hooks/use-leave-room";
import { BRAND_COLORS, ON_COLOR, radius, spacing, stroke } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export default function TurnResultScreen() {
  const playerId = useSessionStore((state) => state.playerId);
  const isHost = useSessionStore((state) => state.isHost);
  const gameState = useRoomStore((state) => state.gameState);
  const players = useRoomStore((state) => state.players);
  const settings = useRoomStore((state) => state.settings);
  const guessed = useRoomStore((state) => state.guessed);
  const onLeave = useLeaveRoom();

  const msLeft = useCountdown(gameState?.phaseEndsAt);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const drawerId = gameState?.currentDrawerId;
  const drawer = players[drawerId ?? ""];
  const guessCount = Object.keys(guessed).length;
  const drawerBonus = gameState?.lastDrawerBonus || 0;
  const ranking = toRanking(players);
  const line = { borderColor: theme.line };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.md,
        },
      ]}
    >
      <View style={styles.topBar}>
        <CodeLabel>{`ronde ${gameState?.currentRound || 1}/${settings?.maxRounds || 3}`}</CodeLabel>
        <LeaveButton isHost={isHost} onPress={onLeave} />
      </View>

      <View style={[styles.ticket, line, { backgroundColor: theme.surface }]}>
        <CodeLabel style={styles.ticketLabel}>het woord was</CodeLabel>
        <View style={[styles.wordBand, line, { backgroundColor: theme.yellow }]}>
          <ThemedText
            type="display"
            style={styles.word}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {gameState?.currentWord || "?"}
          </ThemedText>
        </View>

        <View style={styles.stats}>
          <View style={[styles.stat, { backgroundColor: theme.green }]}>
            <ThemedText type="code" style={styles.onColor}>
              geraden
            </ThemedText>
            <ThemedText type="heading" style={styles.onColor}>
              {guessCount === 0 ? "Niemand" : `${guessCount} ${guessCount === 1 ? "speler" : "spelers"}`}
            </ThemedText>
          </View>
          <View style={[styles.stat, styles.statDivider, line]}>
            <ThemedText type="code" themeColor="textMuted" numberOfLines={1}>
              {drawer ? drawer.name : "tekenaar"}
            </ThemedText>
            <ThemedText type="heading">+{drawerBonus}</ThemedText>
          </View>
        </View>

        <View style={[styles.stripe, line]}>
          {BRAND_COLORS.map((color) => (
            <View key={color} style={[styles.stripePart, { backgroundColor: theme[color] }]} />
          ))}
        </View>
      </View>

      <FlashList
        data={ranking}
        keyExtractor={(player) => player.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: player, index }) => {
          const entry = guessed[player.id];
          const gained = (entry?.points || 0) + (player.id === drawerId ? drawerBonus : 0);
          return (
            <PlayerRow
              player={player}
              rank={index}
              showScore
              gained={gained}
              isYou={player.id === playerId}
              isDrawer={player.id === drawerId}
            />
          );
        }}
      />

      <CodeLabel style={styles.next}>
        {`volgende beurt over ${Math.ceil(msLeft / 1000)}s`}
      </CodeLabel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.xl },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  ticket: {
    borderWidth: stroke.regular,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  ticketLabel: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2 },
  wordBand: {
    borderTopWidth: stroke.regular,
    borderBottomWidth: stroke.regular,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  word: { color: ON_COLOR.yellow, letterSpacing: 1 },
  stats: { flexDirection: "row" },
  stat: { flex: 1, padding: spacing.lg, gap: 2 },
  statDivider: { borderLeftWidth: stroke.regular },
  onColor: { color: ON_COLOR.green },
  stripe: { flexDirection: "row", height: 12, borderTopWidth: stroke.regular },
  stripePart: { flex: 1 },
  listContent: { paddingBottom: spacing.sm },
  next: { textAlign: "center", marginTop: spacing.sm },
});
