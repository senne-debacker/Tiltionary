// "Player X is drawing!" Shown for five seconds so everyone knows whose turn
// it is.

import { StyleSheet, View, Animated } from "react-native";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCountdown } from "@/hooks/use-server-time";
import { useSessionStore } from "@/hooks/use-session-store";
import { useRoomStore } from "@/hooks/use-room-store";
import { useLeaveRoom } from "@/hooks/use-leave-room";
import { usePopIn } from "@/hooks/use-pop-in";
import LeaveButton from "@/components/leave-button";
import { DigitTiles } from "@/components/digit-tiles";
import { CodeLabel, ThemedText } from "@/components/themed-text";
import { ON_COLOR, radius, spacing, stroke } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export default function AnnouncementScreen() {
  const playerId = useSessionStore((state) => state.playerId);
  const isHost = useSessionStore((state) => state.isHost);
  const gameState = useRoomStore((state) => state.gameState);
  const players = useRoomStore((state) => state.players);
  const settings = useRoomStore((state) => state.settings);
  const onLeave = useLeaveRoom();

  const msLeft = useCountdown(gameState?.phaseEndsAt);
  const drawer = players[gameState?.currentDrawerId ?? ""];
  const isYou = gameState?.currentDrawerId === playerId;
  const scale = usePopIn();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top + spacing.md },
      ]}
    >
      <View style={styles.topBar}>
        <CodeLabel>{`ronde ${gameState?.currentRound || 1} van ${settings?.maxRounds || 3}`}</CodeLabel>
        <LeaveButton isHost={isHost} onPress={onLeave} />
      </View>

      <View style={styles.center}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: theme.yellow, borderColor: theme.line },
            { transform: [{ scale }] },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: theme.blue, borderColor: theme.line }]}>
            <SymbolView
              name={{ ios: "pencil", android: "edit", web: "edit" }}
              size={30}
              tintColor={ON_COLOR.blue}
            />
          </View>
          <ThemedText type="display" style={styles.onYellow} numberOfLines={1} adjustsFontSizeToFit>
            {isYou ? "Jij tekent!" : drawer?.name || "Speler"}
          </ThemedText>
          {!isYou && (
            <ThemedText type="heading" style={styles.onYellow}>
              is aan het tekenen
            </ThemedText>
          )}
        </Animated.View>

        <ThemedText themeColor="textMuted" style={styles.hint}>
          {isYou
            ? "Maak je klaar, je mag zo een woord kiezen."
            : "Hou de chat in de gaten en raad zo snel mogelijk."}
        </ThemedText>

        <DigitTiles value={String(Math.ceil(msLeft / 1000))} size="lg" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.xl },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.xl },
  card: {
    width: "100%",
    alignItems: "center",
    paddingVertical: spacing.xxl + 8,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: stroke.regular,
    gap: spacing.sm,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: stroke.regular,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  onYellow: { color: ON_COLOR.yellow, textAlign: "center" },
  hint: { textAlign: "center" },
});
