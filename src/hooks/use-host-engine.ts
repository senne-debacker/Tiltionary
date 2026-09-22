// src/hooks/use-host-engine.ts
// De telefoon van de host is de "scheidsrechter": alleen die zet het spel door
// naar de volgende fase. Alle andere telefoons kijken gewoon naar wat er in
// Firebase staat. Zo kan het nooit dubbel gebeuren.
//
// Elke fase heeft een absolute eindtijd (phaseEndsAt). De host checkt een paar
// keer per seconde of die verstreken is.

import { useEffect, useRef, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../../firebaseConfig";
import {
  beginChoosing,
  startDrawingTurn,
  endTurn,
  advanceTurn,
  sendSystemMessage,
} from "@/logic/room";
import { pickWords } from "@/data/words";
import type {
  GameState,
  GuessedMap,
  PlayerMap,
  RoomSettings,
} from "@/types/game";

type HostEngineArgs = {
  isHost: boolean;
  code: string;
  gameState: GameState | null;
  players: PlayerMap;
  settings: RoomSettings | null;
  serverNow: () => number;
};

/** Wat de tick-lus nodig heeft; via een ref, zodat de interval stabiel blijft. */
type EngineSnapshot = {
  gameState: GameState | null;
  players: PlayerMap;
  settings: RoomSettings | null;
  guessed: GuessedMap;
};

const TICK_MS = 400;

export default function useHostEngine({
  isHost,
  code,
  gameState,
  players,
  settings,
  serverNow,
}: HostEngineArgs) {
  const [guessed, setGuessed] = useState<GuessedMap>({});
  const latest = useRef<EngineSnapshot>({
    gameState: null,
    players: {},
    settings: null,
    guessed: {},
  });
  // Elke fase krijgt een unieke sleutel. Zo voert de host een overgang nooit
  // twee keer uit terwijl hij wacht tot de nieuwe status binnenkomt.
  const handledRef = useRef("");
  // Voor het opmerken van spelers die verdwijnen (zie effect hieronder).
  const previousPlayersRef = useRef<PlayerMap | null>(null);
  const previousCodeRef = useRef<string | null>(null);

  latest.current = { gameState, players, settings, guessed };

  // De host houdt bij wie er al geraden heeft (voor "iedereen is klaar").
  useEffect(() => {
    if (!isHost || !code) return;
    const unsubscribe = onValue(ref(db, `rooms/${code}/turn/guessed`), (snap) =>
      setGuessed((snap.val() as GuessedMap | null) || {}),
    );
    return () => unsubscribe();
  }, [isHost, code]);

  // Merkt spelers op die verdwijnen (app gesloten, verbinding kwijt, of
  // gekickt) en post daar een chatbericht over, zodat de rest van de groep
  // weet wat er gebeurd is. Draait alleen op de host, zodat dit maar 1x
  // gebeurt en niet dubbel/drievoudig vanaf elk toestel.
  useEffect(() => {
    if (!isHost || !code || !players) return;

    if (previousCodeRef.current !== code) {
      // Nieuwe/andere kamer: niets om de huidige spelers mee te vergelijken.
      previousCodeRef.current = code;
      previousPlayersRef.current = null;
    }

    const previous = previousPlayersRef.current;
    previousPlayersRef.current = players;
    if (!previous) return;

    Object.keys(previous).forEach((id) => {
      if (players[id]) return; // nog steeds aanwezig
      const name = previous[id]?.name || "Een speler";
      sendSystemMessage({ code, text: `${name} heeft het spel verlaten.` });
    });
  }, [isHost, code, players]);

  useEffect(() => {
    if (!isHost || !code) return;

    const id = setInterval(async () => {
      const { gameState, players, settings, guessed } = latest.current;
      if (!gameState || !settings) return;
      if (["lobby", "podium"].includes(gameState.status)) return;

      const key = `${gameState.status}:${gameState.phaseEndsAt}`;
      if (handledRef.current === key) return;

      const now = serverNow();
      const timeUp = !!gameState.phaseEndsAt && now >= gameState.phaseEndsAt;
      const drawerGone = !players?.[gameState.currentDrawerId];

      try {
        switch (gameState.status) {
          case "announcement": {
            if (!timeUp && !drawerGone) return;
            handledRef.current = key;
            if (drawerGone) {
              await advanceTurn({ code, gameState, players, settings, serverNow });
            } else {
              await beginChoosing({ code, gameState, settings, serverNow });
            }
            break;
          }

          case "choosing": {
            if (!timeUp && !drawerGone) return;
            handledRef.current = key;
            if (drawerGone) {
              await advanceTurn({ code, gameState, players, settings, serverNow });
              break;
            }
            // Tekenaar heeft niet gekozen: we kiezen er zelf een.
            const word =
              gameState.wordChoices?.[0] ||
              pickWords(settings.wordPack, gameState.usedWords || {}, 1)[0];
            await startDrawingTurn({ code, word, gameState, serverNow });
            break;
          }

          case "playing": {
            const guessers = Object.keys(players || {}).filter(
              (id) => id !== gameState.currentDrawerId,
            );
            const everyoneGuessed =
              guessers.length > 0 && guessers.every((id) => guessed?.[id]);

            if (!timeUp && !everyoneGuessed && !drawerGone) return;
            handledRef.current = key;

            if (everyoneGuessed && !timeUp) {
              await sendSystemMessage({
                code,
                text: "Iedereen heeft het geraden! 🎉",
                tone: "success",
              });
            } else if (drawerGone) {
              await sendSystemMessage({
                code,
                text: "De tekenaar is weg. Beurt voorbij!",
              });
            } else {
              await sendSystemMessage({
                code,
                text: `De tijd is om! Het woord was "${gameState.currentWord}".`,
              });
            }
            await endTurn({ code, gameState, guessed, serverNow });
            break;
          }

          case "turnResult": {
            if (!timeUp) return;
            handledRef.current = key;
            await advanceTurn({ code, gameState, players, settings, serverNow });
            break;
          }
        }
      } catch (error) {
        // Mislukt? Sleutel vrijgeven zodat we het opnieuw proberen.
        handledRef.current = "";
        console.log("Host engine fout:", error);
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [isHost, code, serverNow]);
}
