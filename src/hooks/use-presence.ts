// Handles players closing the app, backgrounding it or losing their network.
// Removal goes through Firebase's onDisconnect(), which the server runs even
// when the app has no time left to run JavaScript (see room.ts).
//
// - Host closes the app, crashes or loses network: the whole room is removed.
//   Every guest sees gameState turn null and returns to the home screen.
// - Host only backgrounds the app: the room waits HOST_AWAY_GRACE_MS. If the
//   host is not back by then, any phone that notices removes the room. The
//   host cannot do this itself, because timers pause in the background.
// - Guest leaves: only that player is removed. useRoomSubscription notices
//   and the host posts a "left the game" message.

import { useEffect } from "react";
import { AppState } from "react-native";
import { ref, onValue } from "firebase/database";
import { db } from "../../firebaseConfig";
import {
  attachHostDisconnect,
  attachPlayerDisconnect,
  setHostAway,
  removeRoom,
  HOST_AWAY_GRACE_MS,
} from "@/logic/room";
import { serverNow } from "@/hooks/use-server-time";
import { useRoomStore } from "@/hooks/use-room-store";
import { useSessionStore } from "@/hooks/use-session-store";

/** Keeps this phone's presence in the room up to date. Call it once. */
export default function usePresence() {
  const code = useSessionStore((state) => state.code);
  const playerId = useSessionStore((state) => state.playerId);
  const isHost = useSessionStore((state) => state.isHost);
  const hostAwaySince = useRoomStore((state) => state.gameState?.hostAwaySince);

  // An onDisconnect instruction fires only once. It is attached again after
  // every reconnect, so a short network drop does not leave a player
  // unprotected against a second, real disconnect.
  useEffect(() => {
    if (!code || !playerId) return;

    return onValue(ref(db, ".info/connected"), (snap) => {
      if (!snap.val()) return;
      if (isHost) attachHostDisconnect(code);
      else attachPlayerDisconnect(code, playerId);
    });
  }, [code, playerId, isHost]);

  // The host reports when the app goes to the background and comes back.
  useEffect(() => {
    if (!isHost || !code) return;

    let away = false;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
        away = true;
        setHostAway({ code, since: serverNow() });
      } else if (nextState === "active" && away) {
        away = false;
        setHostAway({ code, since: null });
      }
    });

    return () => subscription.remove();
  }, [isHost, code]);

  // Every phone, guests included, removes the room once the grace period
  // runs out. Removing twice is harmless.
  useEffect(() => {
    if (!code || !hostAwaySince) return;

    const id = setInterval(() => {
      if (serverNow() - hostAwaySince > HOST_AWAY_GRACE_MS) removeRoom(code);
    }, 2000);

    return () => clearInterval(id);
  }, [code, hostAwaySince]);
}
