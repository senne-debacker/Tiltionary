// The host's phone acts as referee: only the host moves the game to its next
// phase. Every other phone just shows what Firebase says, so a phase change
// can never happen twice.
//
// Each phase has an absolute end time (phaseEndsAt). The host checks a few
// times per second whether it has passed.

import { useEffect } from "react";
import {
  beginChoosing,
  startDrawingTurn,
  endTurn,
  advanceTurn,
  sendSystemMessage,
} from "@/logic/room";
import { pickWords } from "@/data/words";
import { serverNow } from "@/hooks/use-server-time";
import { useRoomStore } from "@/hooks/use-room-store";
import { useSessionStore } from "@/hooks/use-session-store";

const TICK_MS = 400;

/** Runs the phase loop on the host's phone. Does nothing for guests. */
export default function useHostEngine() {
  const code = useSessionStore((state) => state.code);
  const isHost = useSessionStore((state) => state.isHost);

  useEffect(() => {
    if (!isHost || !code) return;

    // Key of the phase that was already handled. The next status takes a
    // moment to arrive, and without this the host would repeat a transition.
    let handled = "";

    const tick = async () => {
      const { gameState, players, settings, guessed } = useRoomStore.getState();
      if (!gameState || !settings) return;
      if (gameState.status === "lobby" || gameState.status === "podium") return;

      const key = `${gameState.status}:${gameState.phaseEndsAt}`;
      if (handled === key) return;

      const timeUp = !!gameState.phaseEndsAt && serverNow() >= gameState.phaseEndsAt;
      const drawerGone = !players[gameState.currentDrawerId];

      try {
        switch (gameState.status) {
          case "announcement": {
            if (!timeUp && !drawerGone) return;
            handled = key;
            if (drawerGone) {
              await advanceTurn({ code, gameState, players, settings, serverNow });
            } else {
              await beginChoosing({ code, gameState, settings, serverNow });
            }
            break;
          }

          case "choosing": {
            if (!timeUp && !drawerGone) return;
            handled = key;
            if (drawerGone) {
              await advanceTurn({ code, gameState, players, settings, serverNow });
              break;
            }
            // The drawer ran out of time, so the host picks a word for them.
            const word =
              gameState.wordChoices?.[0] ||
              pickWords(settings.wordPack, gameState.usedWords || {}, 1)[0];
            await startDrawingTurn({ code, word, gameState, serverNow });
            break;
          }

          case "playing": {
            const guessers = Object.keys(players).filter(
              (id) => id !== gameState.currentDrawerId,
            );
            const everyoneGuessed =
              guessers.length > 0 && guessers.every((id) => guessed[id]);

            if (!timeUp && !everyoneGuessed && !drawerGone) return;
            handled = key;

            if (everyoneGuessed && !timeUp) {
              await sendSystemMessage({
                code,
                text: "Iedereen heeft het geraden!",
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
            handled = key;
            await advanceTurn({ code, gameState, players, settings, serverNow });
            break;
          }
        }
      } catch (error) {
        // Release the key so the next tick retries the transition.
        handled = "";
        console.log("Host engine error:", error);
      }
    };

    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [isHost, code]);
}
