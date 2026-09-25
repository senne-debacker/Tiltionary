// Final screen: a podium of colored blocks for the top three, with the full
// ranking below it.

import { StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PlayerRow, { RANK_COLORS } from "@/components/player-row";
import { Button } from "@/components/button";
import { CodeLabel, ThemedText } from "@/components/themed-text";
import { toRanking } from "@/logic/scoring";
import { playAgain } from "@/logic/room";
import { useSessionStore } from "@/hooks/use-session-store";
import { useRoomStore } from "@/hooks/use-room-store";
import { useLeaveRoom } from "@/hooks/use-leave-room";
import { ON_COLOR, fonts, radius, spacing, stroke } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/** Second place on the left, first in the middle, third on the right. */
const PODIUM_ORDER = [1, 0, 2];
const PODIUM_HEIGHTS = [140, 104, 76];

export default function PodiumScreen() {
  const roomCode = useSessionStore((state) => state.code);
  const playerId = useSessionStore((state) => state.playerId);
  const isHost = useSessionStore((state) => state.isHost);
  const players = useRoomStore((state) => state.players);
  const onLeave = useLeaveRoom();

  const ranking = toRanking(players);
  const winner = ranking[0];
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.md,
        },
      ]}
    >
      <CodeLabel>einde van het spel</CodeLabel>
      <ThemedText type="display">Eindstand</ThemedText>
      {!!winner && (
        <ThemedText themeColor="textMuted">
          {winner.name} wint met {winner.score} punten!
        </ThemedText>
      )}

      <View style={styles.podium}>
        {PODIUM_ORDER.map((rank) => {
          const player = ranking[rank];
          if (!player) return <View key={rank} style={styles.slot} />;
          const color = RANK_COLORS[rank];
          return (
            <View key={rank} style={styles.slot}>
              <ThemedText type="strong" numberOfLines={1}>
                {player.name}
              </ThemedText>
              <ThemedText type="code" themeColor="textMuted" style={styles.slotScore}>
                {player.score}
              </ThemedText>
              <View
                style={[
                  styles.block,
                  {
                    height: PODIUM_HEIGHTS[rank],
                    backgroundColor: theme[color],
                    borderColor: theme.line,
                  },
                ]}
              >
                <ThemedText style={[styles.blockRank, { color: ON_COLOR[color] }]}>
                  {rank + 1}
                </ThemedText>
              </View>
            </View>
          );
        })}
      </View>

      <FlashList
        data={ranking}
        keyExtractor={(player) => player.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: player, index }) => (
          <PlayerRow player={player} rank={index} showScore isYou={player.id === playerId} />
        )}
      />

      <View style={styles.footer}>
        {isHost ? (
          <Button
            label="Nog een keer"
            icon={{ ios: "arrow.clockwise", android: "replay" }}
            size="lg"
            onPress={() => playAgain({ code: roomCode, players })}
          />
        ) : (
          <CodeLabel style={styles.waiting}>wachten of de host nog een potje start...</CodeLabel>
        )}
        <Button
          label={isHost ? "Kamer sluiten" : "Kamer verlaten"}
          variant="outline"
          tint={theme.redText}
          onPress={onLeave}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.xl, gap: spacing.xs },
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  slot: { flex: 1, alignItems: "center" },
  slotScore: { marginBottom: spacing.sm },
  block: {
    width: "100%",
    borderWidth: stroke.regular,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    alignItems: "center",
    paddingTop: spacing.sm,
  },
  blockRank: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 48 },
  listContent: { paddingBottom: spacing.sm },
  footer: { gap: spacing.sm, marginTop: spacing.sm },
  waiting: { textAlign: "center", paddingVertical: spacing.sm },
});
