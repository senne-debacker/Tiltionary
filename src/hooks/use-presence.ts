// src/hooks/use-presence.ts
// Regelt wat er gebeurt als iemand de app sluit, backgroundt, of het netwerk
// verliest — zie de opmerking bovenaan room.js voor waarom dit via Firebase's
// onDisconnect() gaat in plaats van te proberen dit zelf op te vangen in JS.
//
//  - Host sluit de app (of crasht, of verliest het netwerk): de hele kamer
//    wordt meteen verwijderd. Alle spelers zien dat vanzelf via hun gewone
//    room-listener (gameState wordt null) en gaan terug naar het startscherm.
//  - Host backgroundt de app maar sluit 'm niet (bv. even een berichtje
//    lezen): geen onmiddellijke cancel. We geven HOST_AWAY_GRACE_MS de tijd
//    om terug te komen. Komt de host niet op tijd terug, dan ruimt WELK
//    TOESTEL DAN OOK dat opmerkt de kamer op — expres niet enkel de host zelf,
//    want zijn eigen JS-timers lopen niet betrouwbaar door zolang de app in
//    de achtergrond zit (React Native pauzeert die dan).
//  - Gast sluit de app / verliest het netwerk: alleen die speler verdwijnt.
//    useHostEngine merkt dat op en post de "X heeft het spel verlaten"-chat.
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { ref, onValue } from "firebase/database";
import { db } from "../../firebaseConfig";
import {
  attachHostDisconnect,
  attachPlayerDisconnect,
  setHostAway,
  removeRoom,
  HOST_AWAY_GRACE_MS,
} from "@/logic/room";

export default function usePresence({
  code,
  playerId,
  isHost,
  hostAwaySince,
  serverNow,
}: {
  code: string;
  playerId: string;
  isHost: boolean;
  hostAwaySince?: number | null;
  serverNow: () => number;
}) {
  const hostAwayRef = useRef(false);

  // (Opnieuw) instellen van de onDisconnect-instructie, telkens de verbinding
  // (her)opgebouwd wordt. Zo'n instructie vuurt maar 1x, dus na een korte
  // netwerk-hik (niet: de app sluiten) moet hij opnieuw ingesteld worden —
  // anders zou een speler die even wifi verloor en vanzelf weer verbond niet
  // meer beschermd zijn bij een 2e, echte disconnect.
  useEffect(() => {
    if (!code || !playerId) return undefined;

    const unsubscribe = onValue(ref(db, ".info/connected"), (snap) => {
      if (!snap.val()) return;
      if (isHost) attachHostDisconnect(code);
      else attachPlayerDisconnect(code, playerId);
    });

    return () => unsubscribe();
  }, [code, playerId, isHost]);

  // Host: bijhouden of de app naar de achtergrond gaat / terugkomt.
  useEffect(() => {
    if (!isHost || !code) return undefined;

    const handleChange = (nextState: AppStateStatus) => {
      if (nextState === "background") {
        hostAwayRef.current = true;
        setHostAway({ code, since: serverNow() });
      } else if (nextState === "active" && hostAwayRef.current) {
        hostAwayRef.current = false;
        setHostAway({ code, since: null });
      }
    };

    const subscription = AppState.addEventListener("change", handleChange);
    return () => subscription.remove();
  }, [isHost, code, serverNow]);

  // Elk toestel (bewust ook de gasten): als de genadetijd verstreken is
  // zonder dat de host terugkwam, kamer opruimen. Idempotent — het maakt niet
  // uit als meerdere toestellen dit tegelijk proberen.
  useEffect(() => {
    if (!code || !hostAwaySince) return undefined;

    const id = setInterval(() => {
      if (serverNow() - hostAwaySince > HOST_AWAY_GRACE_MS) {
        removeRoom(code);
      }
    }, 2000);

    return () => clearInterval(id);
  }, [code, hostAwaySince, serverNow]);
}
