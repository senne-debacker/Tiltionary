// The "leave or close room" flow in one place: ask for confirmation, clean up
// in Firebase and clear the local session.

import { Alert } from "react-native";
import { leaveRoom } from "@/logic/room";
import { useSessionStore } from "@/hooks/use-session-store";

/** Returns a handler that asks to leave the room and then leaves it. */
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
            // Clear the session first. Firebase reports our own removal
            // right away, and the room listener must see it as expected.
            clearSession();
            leaveRoom({ code, playerId, isHost });
          },
        },
      ],
    );
  };
}
