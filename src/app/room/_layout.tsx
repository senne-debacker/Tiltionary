// Everything that applies to the whole room: the Firebase listeners, the
// host's game engine, presence, and which phase screen is shown.
//
// The phase comes from Firebase and is the same for everyone. Each phase has
// its own screen behind a guard, and exactly one guard is true at a time. When
// the status changes, the old screen is replaced on every phone at once.

import { StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRoomSubscription } from "@/hooks/use-room-subscription";
import { useSessionStore } from "@/hooks/use-session-store";
import { useRoomStore } from "@/hooks/use-room-store";
import useHostEngine from "@/hooks/use-host-engine";
import usePresence from "@/hooks/use-presence";
import { useTheme } from "@/hooks/use-theme";

export default function RoomLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const code = useSessionStore((state) => state.code);
  const isHost = useSessionStore((state) => state.isHost);
  const gameState = useRoomStore((state) => state.gameState);
  const loaded = useRoomStore((state) => state.loaded);

  useRoomSubscription(code);
  useHostEngine();
  usePresence();

  const status = gameState?.status;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!loaded}>
          <Stack.Screen name="loading" />
        </Stack.Protected>

        <Stack.Protected guard={loaded && (!status || status === "lobby")}>
          <Stack.Screen name="waiting" />
        </Stack.Protected>

        <Stack.Protected guard={status === "announcement"}>
          <Stack.Screen name="announcement" />
        </Stack.Protected>

        <Stack.Protected guard={status === "choosing" || status === "playing"}>
          <Stack.Screen name="play" />
        </Stack.Protected>

        <Stack.Protected guard={status === "turnResult"}>
          <Stack.Screen name="result" />
        </Stack.Protected>

        <Stack.Protected guard={status === "podium"}>
          <Stack.Screen name="podium" />
        </Stack.Protected>
      </Stack>

      {/* Guests only. Without it, a paused game looks like a frozen app. */}
      {!isHost && !!gameState?.hostAwaySince && (
        <View
          style={[
            styles.awayBanner,
            { backgroundColor: theme.warning, paddingTop: insets.top + 8 },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.awayBannerText}>
            ⏳ Host is even weg... het spel wacht.
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  awayBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 10,
    alignItems: "center",
  },
  awayBannerText: { color: "#1A1625", fontWeight: "700", fontSize: 13 },
});
