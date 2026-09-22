// src/hooks/use-leave-room.ts
// De "verlaat/sluit kamer"-flow op één plek: bevestiging vragen, opruimen in
// Firebase, en de lokale sessie wissen.

import { Alert } from "react-native";
import { leaveRoom } from "@/logic/room";
import { useSessionStore } from "@/hooks/use-session-store";

export function useLeaveRoom() {
  return () => {
    const { code, playerId, isHost, clearSession } = useSessionStore.getState();

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
            clearSession();
          },
        },
      ],
    );
  };
}
