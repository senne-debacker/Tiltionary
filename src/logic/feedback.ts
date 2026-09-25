// Sound and haptics that react to the game itself instead of to a screen.
// Everything here follows the stores directly, so no component needs an
// effect to start music or buzz the phone.
//
// The audio players live for the whole app. A player made in a screen would
// be released on unmount and cut off the "ding" when the screen changes.

import * as Haptics from "expo-haptics";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { useRoomStore } from "@/hooks/use-room-store";
import { useSessionStore } from "@/hooks/use-session-store";
import { useSettingsStore } from "@/hooks/use-settings-store";
import type { GameStatus } from "@/types/game";

type Track = "home" | "lobby" | "game" | "podium";

const LOBBY_MUSIC = require("../../assets/music/lobby-music.mp3");
const GAME_MUSIC = require("../../assets/music/game-music.mp3");

/**
 * Background music per part of the app. Parts that share a file keep playing
 * without restarting when you move between them.
 */
const TRACKS: Record<Track, number> = {
  home: LOBBY_MUSIC,
  lobby: LOBBY_MUSIC,
  game: GAME_MUSIC,
  podium: GAME_MUSIC,
};

/** Music stays below the "ding" so a correct guess is always audible. */
const MUSIC_VOLUME = 0.5;

let started = false;
let currentSource: number | null = null;
let music: ReturnType<typeof createAudioPlayer> | null = null;
let ding: ReturnType<typeof createAudioPlayer> | null = null;

// ---- Sound ----

/** Picks the track for where the player is right now. */
function trackForState(): Track {
  if (!useSessionStore.getState().code) return "home";

  const status = useRoomStore.getState().gameState?.status;
  if (!status || status === "lobby") return "lobby";
  if (status === "podium") return "podium";
  return "game";
}

/** Starts, switches or stops the music to match the stores. */
function syncMusic() {
  if (!music) return;

  if (!useSettingsStore.getState().soundEnabled) {
    music.pause();
    return;
  }

  const source = TRACKS[trackForState()];
  if (source === currentSource && music.playing) return;

  if (source !== currentSource) {
    currentSource = source;
    music.replace(source);
  }
  music.play();
}

/** Plays the "ding" for a correct guess, only on this phone. */
export function playDing() {
  if (!ding || !useSettingsStore.getState().soundEnabled) return;
  ding.seekTo(0).finally(() => ding?.play());
}

// ---- Haptics ----

/** Gives a short buzz when a phase starts that deserves attention. */
function onPhaseChange(status: GameStatus | undefined) {
  if (status === "announcement") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } else if (status === "podium") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

// ---- Setup ----

/** Creates the players and starts following the stores. Safe to call twice. */
export function startFeedback() {
  if (started) return;
  started = true;

  setAudioModeAsync({ playsInSilentMode: true }).catch((error) =>
    console.log("Audio mode error:", error),
  );

  music = createAudioPlayer(null);
  music.loop = true;
  music.volume = MUSIC_VOLUME;
  ding = createAudioPlayer(require("../../assets/ding.mp3"));

  useSessionStore.subscribe(syncMusic);
  useSettingsStore.subscribe(syncMusic);
  useRoomStore.subscribe((state, previous) => {
    const status = state.gameState?.status;
    if (status === previous.gameState?.status) return;
    onPhaseChange(status);
    syncMusic();
  });

  syncMusic();
}
