// Listens to the current room in Firebase and writes everything to the room
// store. Screens only read from that store, so they never open listeners.
//
// Each part of the room gets its own listener instead of one on the whole
// room. The drawing updates ten times per second, and a single listener
// would re-render every screen on each update.

import { useEffect } from "react";
import { Alert } from "react-native";
import { ref, onValue } from "firebase/database";
import { db } from "../../firebaseConfig";
import { sendSystemMessage } from "@/logic/room";
import { useRoomStore } from "@/hooks/use-room-store";
import { useSessionStore } from "@/hooks/use-session-store";
import type {
  ChatMap,
  GameState,
  GuessedMap,
  PlayerMap,
  RoomDrawing,
  RoomSettings,
} from "@/types/game";

/** Opens the room listeners. Call it once, in the room layout. */
export function useRoomSubscription(code: string) {
  useEffect(() => {
    const store = useRoomStore.getState();

    if (!code) {
      store.reset();
      return;
    }

    // Leaving on purpose clears the session before Firebase reports the
    // removal, so a mismatch here means the change was expected.
    const isCurrentRoom = () => useSessionStore.getState().code === code;

    const onGameState = (next: GameState | null) => {
      store.setGameState(next);
      if (next || !isCurrentRoom()) return;

      // The room is gone: the host closed it, or Firebase removed it after
      // the host disconnected.
      useSessionStore.getState().clearSession();
      Alert.alert("Host is weg", "De host heeft het spel verlaten.");
    };

    const onPlayers = (next: PlayerMap) => {
      const previous = useRoomStore.getState().players;
      store.setPlayers(next);
      if (!isCurrentRoom()) return;

      const { playerId, isHost, clearSession } = useSessionStore.getState();

      if (Object.keys(next).length > 0 && !next[playerId]) {
        clearSession();
        Alert.alert("Verwijderd", "Je bent uit de kamer gezet door de host.");
        return;
      }

      // Only the host announces departures, so the message is posted once.
      if (!isHost) return;
      Object.keys(previous)
        .filter((id) => !next[id])
        .forEach((id) => {
          const name = previous[id]?.name || "Een speler";
          sendSystemMessage({ code, text: `${name} heeft het spel verlaten.` });
        });
    };

    // snap.val() is untyped, so each value is cast to its type exactly once.
    const room = `rooms/${code}`;
    const unsubscribers = [
      onValue(ref(db, `${room}/gameState`), (snap) =>
        onGameState(snap.val() as GameState | null),
      ),
      onValue(ref(db, `${room}/players`), (snap) =>
        onPlayers((snap.val() as PlayerMap | null) || {}),
      ),
      onValue(ref(db, `${room}/settings`), (snap) =>
        store.setSettings(snap.val() as RoomSettings | null),
      ),
      onValue(ref(db, `${room}/chat`), (snap) =>
        store.setChat((snap.val() as ChatMap | null) || {}),
      ),
      onValue(ref(db, `${room}/turn/guessed`), (snap) =>
        store.setGuessed((snap.val() as GuessedMap | null) || {}),
      ),
      onValue(ref(db, `${room}/drawing`), (snap) =>
        store.setDrawing(snap.val() as RoomDrawing | null),
      ),
    ];

    return () => {
      unsubscribers.forEach((off) => off());
      store.reset();
    };
  }, [code]);
}
