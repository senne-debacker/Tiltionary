// src/hooks/use-room-subscription.ts
// Luistert naar de kamer en schrijft alles in de room-store.
//
// Twee bewuste keuzes:
//  - Losse listeners per stuk (gameState / players / settings) i.p.v. één op de
//    hele kamer: tijdens het tekenen worden de lijnen 10x per seconde
//    bijgewerkt, en dan zou de hele app blijven hertekenen.
//  - Wordt maar op ÉÉN plek aangeroepen (de room-layout), niet per scherm,
//    anders open je dezelfde listeners meerdere keren.

import { useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../../firebaseConfig";
import { useRoomStore } from "@/hooks/use-room-store";
import type { GameState, PlayerMap, RoomSettings } from "@/types/game";

export function useRoomSubscription(code: string) {
  useEffect(() => {
    const { setGameState, setPlayers, setSettings, reset } =
      useRoomStore.getState();

    if (!code) {
      reset();
      return;
    }

    // snap.val() is `any`: hier casten we één keer, zodat de rest van de app
    // met echte types werkt in plaats van met onbekende data.
    const unsubscribers = [
      onValue(ref(db, `rooms/${code}/gameState`), (snap) =>
        setGameState(snap.val() as GameState | null),
      ),
      onValue(ref(db, `rooms/${code}/players`), (snap) =>
        setPlayers((snap.val() as PlayerMap | null) || {}),
      ),
      onValue(ref(db, `rooms/${code}/settings`), (snap) =>
        setSettings(snap.val() as RoomSettings | null),
      ),
    ];

    return () => {
      unsubscribers.forEach((off) => off());
      reset();
    };
  }, [code]);
}
