// Haptics that react to the game itself instead of to a screen. They follow
// the stores directly, so no component needs an effect to trigger them.

import * as Haptics from "expo-haptics";
import { useRoomStore } from "@/hooks/use-room-store";
import type { GameStatus } from "@/types/game";

let started = false;

/** Gives a short buzz when a phase starts that deserves attention. */
function onPhaseChange(status: GameStatus | undefined) {
  if (status === "announcement") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } else if (status === "podium") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

/** Starts listening to the stores. Safe to call more than once. */
export function startFeedback() {
  if (started) return;
  started = true;

  useRoomStore.subscribe((state, previous) => {
    const status = state.gameState?.status;
    if (status !== previous.gameState?.status) onPhaseChange(status);
  });
}
