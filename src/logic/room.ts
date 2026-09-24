// Every write to a room in Firebase. Screens call these functions and never
// need to know how the database is structured.
//
// Structure of a room:
//   rooms/{code}/settings   { maxRounds, timerSeconds, wordPack }
//   rooms/{code}/gameState  { status, currentRound, turnIndex, turnOrder, ... }
//   rooms/{code}/players/{playerId}  { name, isHost, score }
//   rooms/{code}/turn/guessed/{playerId} { rank, points, name, at }
//   rooms/{code}/drawing/paths/{i}   { color, points: [{x,y}] }
//   rooms/{code}/chat/{msgId}        { type, name, text, at }

import {
  ref,
  get,
  set,
  push,
  update,
  remove,
  runTransaction,
  onDisconnect,
} from "firebase/database";
import { db } from "../../firebaseConfig";
import { pickWords, DEFAULT_PACK } from "@/data/words";
import { calcTimePoints, placementBonus, drawerPoints } from "./scoring";
import type {
  GameState,
  GuessedMap,
  PlayerMap,
  RoomSettings,
} from "@/types/game";

/** Server time in milliseconds, see serverNow() in use-server-time.ts. */
type ServerNow = () => number;

/** How long "Player X is drawing" is shown. */
export const ANNOUNCE_MS = 5000;
/** Time the drawer gets to pick one of three words. */
export const CHOOSE_MS = 15000;
/** How long the standings are shown after each turn. */
export const RESULT_MS = 6000;

/** How long a backgrounded host gets to come back, see use-presence.ts. */
export const HOST_AWAY_GRACE_MS = 20000;

export const DEFAULT_SETTINGS: RoomSettings = {
  maxRounds: 3,
  timerSeconds: 60,
  wordPack: DEFAULT_PACK,
};

const roomPath = (code: string) => `rooms/${code}`;
const indexPath = (code: string) => `roomIndex/${code}`;

// Rooms nobody closes properly would stay in the database forever. So each
// room keeps one timestamp in a small list (roomIndex), and the next host
// removes old rooms. Only that list is read, because rooms hold drawings and
// are much bigger.
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

/** Marks a room as still in use. */
export function touchRoom(code: string): Promise<void> {
  if (!code) return Promise.resolve();
  return set(ref(db, indexPath(code)), Date.now());
}

/** Removes a room and its entry in the room index. */
export function removeRoom(code: string): Promise<[void, void]> {
  return Promise.all([
    remove(ref(db, roomPath(code))),
    remove(ref(db, indexPath(code))),
  ]);
}

/**
 * Removes rooms that have been idle for hours. Runs whenever someone creates
 * a room, so the database cleans itself up.
 */
export async function cleanupStaleRooms({ now = Date.now() } = {}): Promise<
  string[]
> {
  const snapshot = await get(ref(db, "roomIndex"));
  const index: Record<string, number> = snapshot.val() || {};

  const stale = Object.entries(index)
    .filter(([, lastActive]) => now - (lastActive || 0) > STALE_AFTER_MS)
    .map(([code]) => code);

  await Promise.all(stale.map((code) => removeRoom(code)));
  return stale;
}

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Normalizes a guess so case, spaces and dashes do not matter. */
export function normalizeWord(text = ""): string {
  return text.trim().toUpperCase().replace(/[\s-]/g, "");
}

// ---- Rooms ----

/** Creates a room with a random four-digit code and joins it as host. */
export async function createRoom({
  name,
}: {
  name: string;
}): Promise<{ code: string; playerId: string }> {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const playerId = "p_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

  await set(ref(db, roomPath(code)), {
    createdAt: Date.now(),
    settings: { ...DEFAULT_SETTINGS },
    gameState: {
      status: "lobby",
      currentRound: 1,
      turnIndex: 0,
      currentDrawerId: "",
      currentWord: "",
      phaseEndsAt: 0,
      turnDurationMs: DEFAULT_SETTINGS.timerSeconds * 1000,
    },
    players: {
      [playerId]: { name, isHost: true, score: 0, joinedAt: Date.now() },
    },
  });
  await touchRoom(code);

  return { code, playerId };
}

/** Joins an existing room that is still in the lobby. */
export async function joinRoom({
  code,
  name,
}: {
  code: string;
  name: string;
}): Promise<{ playerId?: string; error?: string }> {
  const snapshot = await get(ref(db, roomPath(code)));
  const data = snapshot.val();

  if (!data) return { error: "Deze kamer bestaat niet." };
  if (data.gameState?.status !== "lobby") {
    return { error: "Dit spel is al begonnen." };
  }

  const playerId = "p_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
  await set(ref(db, `${roomPath(code)}/players/${playerId}`), {
    name,
    isHost: false,
    score: 0,
    joinedAt: Date.now(),
  });
  await touchRoom(code);

  return { playerId };
}

/** Removes a player from the room. Host only. */
export function kickPlayer({ code, playerId }: { code: string; playerId: string }): Promise<void> {
  return remove(ref(db, `${roomPath(code)}/players/${playerId}`));
}

/** Closes the room for a host, or removes only yourself for a guest. */
export async function leaveRoom({
  code,
  playerId,
  isHost,
}: {
  code: string;
  playerId: string;
  isHost: boolean;
}): Promise<void> {
  if (!code) return;
  // A clean exit makes the planned onDisconnect removal unnecessary.
  // Cancelling it avoids a pointless write later.
  if (isHost) {
    onDisconnect(ref(db, roomPath(code))).cancel();
    await removeRoom(code);
  } else {
    onDisconnect(ref(db, `${roomPath(code)}/players/${playerId}`)).cancel();
    await remove(ref(db, `${roomPath(code)}/players/${playerId}`));
  }
}

// ---- Presence ----
//
// Presence means knowing whether a player is still connected. It uses
// Firebase's onDisconnect(): an instruction the server runs as soon as a
// phone drops its connection, through closing the app, a crash or network
// loss. It works even when the app has no time left to run JavaScript.
//
// Such an instruction fires only once, so use-presence.ts attaches it again
// every time ".info/connected" turns true.

/** Removes the whole room when the host disconnects. */
export function attachHostDisconnect(code: string): Promise<void> {
  return onDisconnect(ref(db, roomPath(code))).remove();
}

/** Removes only this player when a guest disconnects. */
export function attachPlayerDisconnect(code: string, playerId: string): Promise<void> {
  return onDisconnect(ref(db, `${roomPath(code)}/players/${playerId}`)).remove();
}

/**
 * Sets or clears the time the host went to the background. Other phones use
 * it to check whether the grace period has passed.
 */
export function setHostAway({ code, since }: { code: string; since: number | null }): Promise<void> {
  return update(ref(db, `${roomPath(code)}/gameState`), { hostAwaySince: since });
}

/** Changes one or more room settings. Host only. */
export function updateSettings({ code, patch }: { code: string; patch: Partial<RoomSettings> }): Promise<void> {
  return update(ref(db, `${roomPath(code)}/settings`), patch);
}

// ---- Game flow ----

/** Resets scores, shuffles the turn order and starts the first turn. */
export async function startGame({
  code,
  players,
  settings,
  serverNow,
}: {
  code: string;
  players: PlayerMap;
  settings: RoomSettings;
  serverNow: ServerNow;
}): Promise<void> {
  const ids = Object.keys(players || {});
  if (ids.length === 0) return;

  const turnOrder = shuffle(ids);
  const updates: Record<string, unknown> = {};

  updates[`${roomPath(code)}/gameState`] = {
    status: "announcement",
    currentRound: 1,
    turnIndex: 0,
    turnOrder,
    currentDrawerId: turnOrder[0],
    currentWord: "",
    phaseEndsAt: serverNow() + ANNOUNCE_MS,
    turnDurationMs: settings.timerSeconds * 1000,
  };
  updates[`${roomPath(code)}/drawing/paths`] = null;
  updates[`${roomPath(code)}/chat`] = null;
  updates[`${roomPath(code)}/turn`] = null;
  ids.forEach((id) => {
    updates[`${roomPath(code)}/players/${id}/score`] = 0;
  });

  await update(ref(db), updates);
  await touchRoom(code);
}

/** Gives the drawer three words to choose from after the announcement. */
export function beginChoosing({
  code,
  gameState,
  settings,
  serverNow,
}: {
  code: string;
  gameState: GameState;
  settings: RoomSettings | null;
  serverNow: ServerNow;
}): Promise<void> {
  const choices = pickWords(
    settings?.wordPack || DEFAULT_PACK,
    gameState.usedWords || {},
    3,
  );

  return update(ref(db, `${roomPath(code)}/gameState`), {
    status: "choosing",
    wordChoices: choices,
    phaseEndsAt: serverNow() + CHOOSE_MS,
  });
}

/** Starts drawing with the chosen word, picked by the drawer or the host. */
export function startDrawingTurn({
  code,
  word,
  gameState,
  serverNow,
}: {
  code: string;
  word: string;
  gameState: GameState;
  serverNow: ServerNow;
}): Promise<void> {
  const updates: Record<string, unknown> = {};
  const gs = `${roomPath(code)}/gameState`;

  updates[`${gs}/status`] = "playing";
  updates[`${gs}/currentWord`] = word;
  updates[`${gs}/wordChoices`] = null;
  updates[`${gs}/phaseEndsAt`] = serverNow() + (gameState.turnDurationMs || 60000);
  updates[`${gs}/usedWords/${word}`] = true;
  updates[`${roomPath(code)}/drawing/paths`] = null;
  updates[`${roomPath(code)}/turn`] = null;

  return update(ref(db), updates);
}

/** Ends the turn, gives the drawer their bonus and shows the standings. */
export async function endTurn({
  code,
  gameState,
  guessed,
  serverNow,
}: {
  code: string;
  gameState: GameState;
  guessed: GuessedMap;
  serverNow: ServerNow;
}): Promise<void> {
  const guessCount = Object.keys(guessed || {}).length;
  const bonus = drawerPoints(guessCount);

  await update(ref(db, `${roomPath(code)}/gameState`), {
    status: "turnResult",
    phaseEndsAt: serverNow() + RESULT_MS,
    lastDrawerBonus: bonus,
  });

  if (bonus > 0 && gameState.currentDrawerId) {
    await runTransaction(
      ref(db, `${roomPath(code)}/players/${gameState.currentDrawerId}/score`),
      (score) => (score || 0) + bonus,
    );
  }
}

/**
 * Returns who draws next, skipping players who left.
 * Returns null when the game is over.
 */
export function computeNextTurn({
  gameState,
  players,
  settings,
}: {
  gameState: GameState | null;
  players: PlayerMap;
  settings: RoomSettings | null;
}): { round: number; index: number; drawerId: string } | null {
  const order = gameState?.turnOrder || [];
  if (order.length === 0) return null;

  const maxRounds = settings?.maxRounds || DEFAULT_SETTINGS.maxRounds;
  let round = gameState?.currentRound || 1;
  let index = gameState?.turnIndex ?? 0;

  // Search at most all remaining turns for a player who is still here.
  for (let step = 0; step < order.length * (maxRounds + 1); step++) {
    index += 1;
    if (index >= order.length) {
      index = 0;
      round += 1;
    }
    if (round > maxRounds) return null;
    if (players?.[order[index]]) {
      return { round, index, drawerId: order[index] };
    }
  }
  return null;
}

/** Moves to the next drawer, or to the podium after the last round. */
export function advanceTurn({
  code,
  gameState,
  players,
  settings,
  serverNow,
}: {
  code: string;
  gameState: GameState;
  players: PlayerMap;
  settings: RoomSettings | null;
  serverNow: ServerNow;
}): Promise<void> {
  const next = computeNextTurn({ gameState, players, settings });
  if (!next) return finishGame({ code });

  const updates: Record<string, unknown> = {};
  const gs = `${roomPath(code)}/gameState`;

  updates[`${gs}/status`] = "announcement";
  updates[`${gs}/currentRound`] = next.round;
  updates[`${gs}/turnIndex`] = next.index;
  updates[`${gs}/currentDrawerId`] = next.drawerId;
  updates[`${gs}/currentWord`] = "";
  updates[`${gs}/wordChoices`] = null;
  updates[`${gs}/lastDrawerBonus`] = null;
  updates[`${gs}/phaseEndsAt`] = serverNow() + ANNOUNCE_MS;
  updates[`${roomPath(code)}/drawing/paths`] = null;
  updates[`${roomPath(code)}/chat`] = null;
  updates[`${roomPath(code)}/turn`] = null;

  return update(ref(db), updates);
}

/** Ends the game and shows the podium. */
export function finishGame({ code }: { code: string }): Promise<void> {
  return update(ref(db, `${roomPath(code)}/gameState`), {
    status: "podium",
    phaseEndsAt: 0,
    currentWord: "",
    wordChoices: null,
  });
}

/** Resets scores and returns everyone to the waiting room. */
export async function playAgain({
  code,
  players,
}: {
  code: string;
  players: PlayerMap;
}): Promise<void> {
  const updates: Record<string, unknown> = {};
  const gs = `${roomPath(code)}/gameState`;

  updates[`${gs}/status`] = "lobby";
  updates[`${gs}/currentRound`] = 1;
  updates[`${gs}/turnIndex`] = 0;
  updates[`${gs}/currentDrawerId`] = "";
  updates[`${gs}/currentWord`] = "";
  updates[`${gs}/wordChoices`] = null;
  updates[`${gs}/usedWords`] = null;
  updates[`${gs}/lastDrawerBonus`] = null;
  updates[`${gs}/phaseEndsAt`] = 0;
  updates[`${roomPath(code)}/drawing/paths`] = null;
  updates[`${roomPath(code)}/chat`] = null;
  updates[`${roomPath(code)}/turn`] = null;
  Object.keys(players || {}).forEach((id) => {
    updates[`${roomPath(code)}/players/${id}/score`] = 0;
  });

  await update(ref(db), updates);
}

// ---- Chat ----

/** Posts a message from the game itself, such as "Time is up". */
export async function sendSystemMessage({
  code,
  text,
  tone = "info",
}: {
  code: string;
  text: string;
  tone?: "info" | "success";
}): Promise<void> {
  await push(ref(db, `${roomPath(code)}/chat`), {
    type: "system",
    tone,
    text,
    at: Date.now(),
  });
}

/**
 * Posts a plain chat message in the waiting room, where there is no word to
 * guess yet. Unlike sendGuess(), it is always shown.
 */
export async function sendChatMessage({
  code,
  playerId,
  name,
  text,
}: {
  code: string;
  playerId: string;
  name: string;
  text: string;
}): Promise<void> {
  const clean = text.trim();
  if (!clean) return;
  await push(ref(db, `${roomPath(code)}/chat`), {
    type: "chat",
    playerId,
    name,
    text: clean,
    at: Date.now(),
  });
}

/**
 * Posts a guess. A correct guess never appears in the chat. The others only
 * see "X guessed it".
 *
 * The guess order uses a transaction, so two players who guess at the same
 * moment cannot both get first place and its bonus.
 */
export async function sendGuess({
  code,
  playerId,
  name,
  text,
  gameState,
  serverNow,
}: {
  code: string;
  playerId: string;
  name: string;
  text: string;
  gameState: GameState | null;
  serverNow: ServerNow;
}): Promise<{
  correct: boolean;
  already?: boolean;
  points?: number;
  rank?: number;
}> {
  const clean = text.trim();
  if (!clean) return { correct: false };

  const isCorrect =
    gameState?.status === "playing" &&
    !!gameState.currentWord &&
    normalizeWord(clean) === normalizeWord(gameState.currentWord);

  if (!isCorrect) {
    await push(ref(db, `${roomPath(code)}/chat`), {
      type: "guess",
      playerId,
      name,
      text: clean,
      at: Date.now(),
    });
    return { correct: false };
  }

  const msLeft = Math.max(0, (gameState.phaseEndsAt || 0) - serverNow());
  const timePoints = calcTimePoints(msLeft, gameState.turnDurationMs);

  const result = await runTransaction(
    ref(db, `${roomPath(code)}/turn/guessed`),
    (current) => {
      const guessed = current || {};
      // Already guessed: returning undefined aborts the transaction.
      if (guessed[playerId]) return;
      const rank = Object.keys(guessed).length + 1;
      guessed[playerId] = {
        rank,
        name,
        timePoints,
        bonus: placementBonus(rank),
        points: timePoints + placementBonus(rank),
        at: Date.now(),
      };
      return guessed;
    },
  );

  if (!result.committed) return { correct: true, already: true };

  const entry = result.snapshot.val()?.[playerId];
  if (!entry) return { correct: true, already: true };

  await runTransaction(
    ref(db, `${roomPath(code)}/players/${playerId}/score`),
    (score) => (score || 0) + entry.points,
  );

  await sendSystemMessage({
    code,
    text: `${name} heeft het geraden!`,
    tone: "success",
  });

  return { correct: true, points: entry.points, rank: entry.rank };
}
