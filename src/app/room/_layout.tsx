// src/app/room/_layout.tsx
// Alles wat voor de hele kamer geldt: de Firebase-listeners, de spelmotor van
// de host, aanwezigheid, en welke fase je te zien krijgt.
//
// De fase komt uit Firebase en is voor iedereen hetzelfde. Elke fase heeft hier
// een eigen scherm met een guard; omdat er altijd precies één guard waar is,
// bevat de navigator ook altijd precies één scherm. Wisselt de status, dan
// verdwijnt het oude scherm en komt het nieuwe ervoor in de plaats — op elke
// telefoon tegelijk, zonder dat iemand op iets moet klikken.

import { useEffect } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";

import { useRoomSubscription } from "@/hooks/use-room-subscription";
import { useSessionStore } from "@/hooks/use-session-store";
import { useRoomStore } from "@/hooks/use-room-store";
import useHostEngine from "@/hooks/use-host-engine";
import usePresence from "@/hooks/use-presence";
import { serverNow } from "@/hooks/use-server-time";
import { useTheme } from "@/hooks/use-theme";

export default function RoomLayout() {
  const theme = useTheme();

  const code = useSessionStore((state) => state.code);
  const playerId = useSessionStore((state) => state.playerId);
  const isHost = useSessionStore((state) => state.isHost);
  const clearSession = useSessionStore((state) => state.clearSession);

  const gameState = useRoomStore((state) => state.gameState);
  const players = useRoomStore((state) => state.players);
  const settings = useRoomStore((state) => state.settings);
  const loaded = useRoomStore((state) => state.loaded);

  useRoomSubscription(code);

  useHostEngine({ isHost, code, gameState, players, settings, serverNow });
  usePresence({
    code,
    playerId,
    isHost,
    hostAwaySince: gameState?.hostAwaySince,
    serverNow,
  });

  // Kamer weg of eruit gezet? Netjes terug naar het startscherm.
  useEffect(() => {
    if (!code || !loaded) return;

    if (!gameState) {
      // Dit vuurt zowel wanneer de host bewust "Sluiten" indrukt, als wanneer
      // Firebase's onDisconnect de kamer opruimt (app dicht, crash, of de
      // genadetijd overschreden — zie use-presence.ts). Voor de speler voelt
      // dat hetzelfde: de host is er niet meer.
      clearSession();
      Alert.alert("Host is weg", "De host heeft het spel verlaten.");
      return;
    }

    const playerIds = Object.keys(players || {});
    if (playerIds.length > 0 && !players[playerId]) {
      clearSession();
      Alert.alert("Verwijderd", "Je bent uit de kamer gezet door de host.");
    }
  }, [code, playerId, loaded, gameState, players, clearSession]);

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

      {/* Puur voor de gasten: de host ziet dit uiteraard niet zelf (die is
          net weg), maar zonder dit voelt een bevroren scherm als een bug. */}
      {!isHost && !!gameState?.hostAwaySince && (
        <View
          style={[styles.awayBanner, { backgroundColor: theme.warning }]}
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
    paddingTop: 50,
    paddingBottom: 10,
    alignItems: "center",
  },
  awayBannerText: { color: "#1A1625", fontWeight: "700", fontSize: 13 },
});
