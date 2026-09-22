// App.js
// Houdt bij wie je bent en in welke kamer je zit, en kiest op basis van de
// status in Firebase welk scherm je ziet. Alle spelers zien dus automatisch
// hetzelfde scherm.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View, Text, Alert, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";

import LobbyScreen from "./src/screens/LobbyScreen";
import WaitingScreen from "./src/screens/WaitingScreen";
import AnnouncementScreen from "./src/screens/AnnouncementScreen";
import GameScreen from "./src/screens/GameScreen";
import TurnResultScreen from "./src/screens/TurnResultScreen";
import PodiumScreen from "./src/screens/PodiumScreen";
import SandboxScreen from "./src/screens/SandboxScreen";

import useRoom from "./src/hooks/useRoom";
import useHostEngine from "./src/hooks/useHostEngine";
import usePresence from "./src/hooks/usePresence";
import { useServerTime } from "./src/hooks/useServerTime";
import { leaveRoom } from "./src/logic/room";
import { colors } from "./src/theme";

const EMPTY_SESSION = {
  code: "",
  playerId: "",
  nickname: "",
  isHost: false,
};

export default function App() {
  const [session, setSession] = useState(EMPTY_SESSION);
  const [sandbox, setSandbox] = useState(false);

  const serverNow = useServerTime();
  const { gameState, players, settings, loaded } = useRoom(session.code);

  useHostEngine({
    isHost: session.isHost,
    code: session.code,
    gameState,
    players,
    settings,
    serverNow,
  });

  usePresence({
    code: session.code,
    playerId: session.playerId,
    isHost: session.isHost,
    hostAwaySince: gameState?.hostAwaySince,
    serverNow,
  });

  // Het geluidje leeft hier, in de component die nooit unmount. Speel je het
  // af in een scherm dat meteen daarna wisselt, dan wordt het afgekapt.
  const dingPlayer = useAudioPlayer(require("./assets/ding.mp3"));
  const leavingRef = useRef(false);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch((e) =>
      console.log("Audio mode error:", e),
    );
  }, []);

  const playDing = useCallback(() => {
    try {
      dingPlayer.seekTo(0).finally(() => dingPlayer.play());
    } catch (error) {
      console.log("Fout bij afspelen ding:", error);
    }
  }, [dingPlayer]);

  const goHome = useCallback(() => {
    leavingRef.current = true;
    setSession(EMPTY_SESSION);
    // Kort blokkeren, anders ziet de listener de kamer nog even verdwijnen
    // en krijg je alsnog een melding.
    setTimeout(() => {
      leavingRef.current = false;
    }, 500);
  }, []);

  const handleLeave = useCallback(() => {
    const { code, playerId, isHost } = session;
    Alert.alert(
      isHost ? "Kamer sluiten?" : "Kamer verlaten?",
      isHost
        ? "Het spel stopt dan voor iedereen."
        : "Je verliest je punten in dit potje.",
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: isHost ? "Sluiten" : "Verlaten",
          style: "destructive",
          onPress: () => {
            leaveRoom({ code, playerId, isHost });
            goHome();
          },
        },
      ],
    );
  }, [session, goHome]);

  // Kamer weg of eruit gezet? Netjes terug naar het startscherm.
  useEffect(() => {
    if (!session.code || !loaded || leavingRef.current) return;

    if (!gameState) {
      // Dit vuurt zowel wanneer de host bewust "Sluiten" indrukt, als
      // wanneer Firebase's onDisconnect de kamer opruimt omdat de host de
      // app sloot/crashte/de genadetijd overschreed (zie usePresence.js) —
      // voor de speler ziet dat er hetzelfde uit: de host is er niet meer.
      goHome();
      Alert.alert("Host is weg", "De host heeft het spel verlaten.");
      return;
    }

    const playerIds = Object.keys(players || {});
    if (playerIds.length > 0 && !players[session.playerId]) {
      goHome();
      Alert.alert("Verwijderd", "Je bent uit de kamer gezet door de host.");
    }
  }, [session.code, session.playerId, loaded, gameState, players, goHome]);

  // ------------------------------------------------------------- Routing

  if (sandbox) {
    return (
      <>
        <StatusBar style="light" />
        <SandboxScreen onExit={() => setSandbox(false)} />
      </>
    );
  }

  if (!session.code) {
    return (
      <>
        <StatusBar style="light" />
        <LobbyScreen
          onEnterRoom={({ code, playerId, name, isHost }) =>
            setSession({ code, playerId, nickname: name, isHost })
          }
          onSandbox={() => setSandbox(true)}
        />
      </>
    );
  }

  if (!loaded || !gameState) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Kamer laden...</Text>
      </View>
    );
  }

  const shared = {
    roomCode: session.code,
    playerId: session.playerId,
    nickname: session.nickname,
    isHost: session.isHost,
    gameState,
    players,
    settings,
    serverNow,
    onLeave: handleLeave,
  };

  const screens = {
    announcement: <AnnouncementScreen {...shared} />,
    choosing: <GameScreen {...shared} onCorrectGuess={playDing} />,
    playing: <GameScreen {...shared} onCorrectGuess={playDing} />,
    turnResult: <TurnResultScreen {...shared} />,
    podium: <PodiumScreen {...shared} />,
  };

  return (
    <>
      <StatusBar style="light" />
      {screens[gameState.status] || <WaitingScreen {...shared} />}
      {/* De host ziet dit uiteraard niet zelf (die is net weg) — dit is puur
          voor de gasten, zodat een bevroren scherm niet als een bug aanvoelt. */}
      {!session.isHost && !!gameState.hostAwaySince && (
        <View style={styles.awayBanner} pointerEvents="none">
          <Text style={styles.awayBannerText}>⏳ Host is even weg... het spel wacht.</Text>
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
    backgroundColor: colors.warning,
    paddingTop: 50,
    paddingBottom: 10,
    alignItems: "center",
  },
  awayBannerText: { color: "#1a1a1a", fontWeight: "700", fontSize: 13 },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: colors.textMuted, marginTop: 12, fontSize: 15 },
});
