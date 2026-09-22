// src/logic/room.js
// Alle schrijfacties naar Firebase zitten hier. De schermen roepen deze
// functies aan en hoeven zelf niets van de databasestructuur te weten.
//
// Structuur van een kamer:
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
import { pickWords, DEFAULT_PACK } from "../data/words";
import { calcTimePoints, placementBonus, drawerPoints } from "./scoring";

// Hoe lang elke fase duurt (in ms)
export const ANNOUNCE_MS = 5000; // "Speler X tekent!"
export const CHOOSE_MS = 15000; // tijd om 1 van de 3 woorden te kiezen
export const RESULT_MS = 6000; // tussenstand na elke beurt

// Hoe lang we een AFWEZIGE (maar niet gesloten) host de kans geven om terug
// te komen voor we de kamer alsnog opruimen. Zie usePresence.js.
export const HOST_AWAY_GRACE_MS = 20000;

export const DEFAULT_SETTINGS = {
  maxRounds: 3,
  timerSeconds: 60,
  wordPack: DEFAULT_PACK,
};

const roomPath = (code) => `rooms/${code}`;
const indexPath = (code) => `roomIndex/${code}`;

// Kamers die niemand netjes afsluit bleven voor altijd in de database staan.
// Daarom houden we per kamer één tijdstempel bij in een klein lijstje
// (roomIndex), en ruimt de eerstvolgende host de oude kamers op. We lezen
// alleen dat lijstje: de kamers zelf bevatten tekeningen en zijn veel groter.
const STALE_AFTER_MS = 6 * 60 * 60 * 1000; // 6 uur

/** Markeert een kamer als "nog in gebruik". */
export function touchRoom(code) {
  if (!code) return Promise.resolve();
  return set(ref(db, indexPath(code)), Date.now());
}

/** Verwijdert een kamer én zijn plekje in het lijstje. */
export function removeRoom(code) {
  return Promise.all([
    remove(ref(db, roomPath(code))),
    remove(ref(db, indexPath(code))),
  ]);
}

/**
 * Ruimt kamers op waar al uren niets meer gebeurd is. Wordt aangeroepen als
 * iemand een nieuwe kamer maakt, zodat het vanzelf schoon blijft.
 */
export async function cleanupStaleRooms({ now = Date.now() } = {}) {
  const snapshot = await get(ref(db, "roomIndex"));
  const index = snapshot.val() || {};

  const stale = Object.entries(index)
    .filter(([, lastActive]) => now - (lastActive || 0) > STALE_AFTER_MS)
    .map(([code]) => code);

  await Promise.all(stale.map((code) => removeRoom(code)));
  return stale;
}

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Vergelijkt een gok met het woord: hoofdletters en spaties maken niet uit. */
export function normalizeWord(text = "") {
  return text.trim().toUpperCase().replace(/[\s-]/g, "");
}

// ---------------------------------------------------------------- Kamer maken

export async function createRoom({ name }) {
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

export async function joinRoom({ code, name }) {
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

export function kickPlayer({ code, playerId }) {
  return remove(ref(db, `${roomPath(code)}/players/${playerId}`));
}

/** Host sluit de kamer, gast verlaat hem alleen zelf. */
export async function leaveRoom({ code, playerId, isHost }) {
  if (!code) return;
  // Dit was een NETTE exit: het bijbehorende onDisconnect-verwijderplannetje
  // (zie attachHostDisconnect/attachPlayerDisconnect) is dan overbodig. Niet
  // annuleren is ook geen ramp (verwijderen van iets dat al weg is, doet
  // niets), maar dit voorkomt een nutteloze latere schrijfactie.
  if (isHost) {
    onDisconnect(ref(db, roomPath(code))).cancel();
    await removeRoom(code);
  } else {
    onDisconnect(ref(db, `${roomPath(code)}/players/${playerId}`)).cancel();
    await remove(ref(db, `${roomPath(code)}/players/${playerId}`));
  }
}

// --------------------------------------------------------------- Aanwezigheid
//
// "Aanwezigheid" = weten of een speler nog echt verbonden is. We gebruiken
// Firebase's onDisconnect(): dat is een instructie die de SERVER uitvoert
// zodra hij merkt dat een toestel de verbinding verliest — door de app te
// sluiten, een crash, of het netwerk te verliezen. Dit werkt dus ook als er
// geen tijd meer is om zelf nog JavaScript uit te voeren (bv. geforceerd
// afsluiten), in tegenstelling tot proberen dit zelf te detecteren in de app.
//
// Belangrijk: zo'n instructie vuurt maar ÉÉN keer. Na een reconnect moet hij
// opnieuw ingesteld worden — dat gebeurt in usePresence.js, telkens als
// ".info/connected" weer true wordt.

/** Host weg (sluiten, crash, verbinding kwijt) => hele kamer verdwijnt. */
export function attachHostDisconnect(code) {
  return onDisconnect(ref(db, roomPath(code))).remove();
}

/** Gast weg => enkel die speler verdwijnt, de rest speelt door. */
export function attachPlayerDisconnect(code, playerId) {
  return onDisconnect(ref(db, `${roomPath(code)}/players/${playerId}`)).remove();
}

/**
 * Zet (of wist) het tijdstip waarop de host naar de achtergrond ging. Andere
 * toestellen gebruiken dit om te bepalen of de genadetijd verstreken is.
 */
export function setHostAway({ code, since }) {
  return update(ref(db, `${roomPath(code)}/gameState`), { hostAwaySince: since });
}

export function updateSettings({ code, patch }) {
  return update(ref(db, `${roomPath(code)}/settings`), patch);
}

// ------------------------------------------------------------- Spel besturing

export async function startGame({ code, players, settings, serverNow }) {
  const ids = Object.keys(players || {});
  if (ids.length === 0) return;

  const turnOrder = shuffle(ids);
  const updates = {};

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

/** Na de aankondiging: de tekenaar krijgt 3 woorden om uit te kiezen. */
export function beginChoosing({ code, gameState, settings, serverNow }) {
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

/** De tekenaar kiest een woord (of de host kiest er bij tijdgebrek zelf een). */
export function startDrawingTurn({ code, word, gameState, serverNow }) {
  const updates = {};
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

/** Beurt is voorbij: tekenaar krijgt zijn bonus en iedereen ziet de uitslag. */
export async function endTurn({ code, gameState, guessed, serverNow }) {
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
 * Wie is er hierna aan de beurt? Spelers die weg zijn slaan we over.
 * Geeft null terug als het spel afgelopen is.
 */
export function computeNextTurn({ gameState, players, settings }) {
  const order = gameState?.turnOrder || [];
  if (order.length === 0) return null;

  const maxRounds = settings?.maxRounds || DEFAULT_SETTINGS.maxRounds;
  let round = gameState.currentRound || 1;
  let index = gameState.turnIndex ?? 0;

  // Maximaal één volledige ronde vooruit zoeken naar een speler die er nog is.
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

export function advanceTurn({ code, gameState, players, settings, serverNow }) {
  const next = computeNextTurn({ gameState, players, settings });
  if (!next) return finishGame({ code });

  const updates = {};
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

export function finishGame({ code }) {
  return update(ref(db, `${roomPath(code)}/gameState`), {
    status: "podium",
    phaseEndsAt: 0,
    currentWord: "",
    wordChoices: null,
  });
}

/** "Opnieuw spelen": scores op 0, terug naar de wachtruimte. */
export async function playAgain({ code, players }) {
  const updates = {};
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

// --------------------------------------------------------------------- Chat

export function sendSystemMessage({ code, text, tone = "info" }) {
  return push(ref(db, `${roomPath(code)}/chat`), {
    type: "system",
    tone,
    text,
    at: Date.now(),
  });
}

/**
 * Een gewoon chatbericht — voor het gebabbel in de wachtruimte, waar er (nog)
 * geen woord is om te raden. In tegenstelling tot sendGuess() wordt dit altijd
 * gewoon getoond, er is niets om "juist" te controleren.
 */
export function sendChatMessage({ code, playerId, name, text }) {
  const clean = text.trim();
  if (!clean) return Promise.resolve();
  return push(ref(db, `${roomPath(code)}/chat`), {
    type: "chat",
    playerId,
    name,
    text: clean,
    at: Date.now(),
  });
}

/**
 * Stuurt een chatbericht. Is het het juiste woord, dan komt het NIET in de
 * chat: de andere spelers zien alleen "X heeft het geraden!".
 *
 * De volgorde van raden wordt met een transactie bepaald, zodat twee spelers
 * die tegelijk raden niet allebei plek 1 (en dus 300 bonuspunten) krijgen.
 */
export async function sendGuess({
  code,
  playerId,
  name,
  text,
  gameState,
  serverNow,
}) {
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
      if (guessed[playerId]) return; // al geraden: transactie afbreken
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
