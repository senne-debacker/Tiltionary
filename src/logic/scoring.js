// src/logic/scoring.js
// Alle puntenregels op één plek, zodat de rest van de app niet hoeft te rekenen.

// Bonus voor wie als 1e, 2e of 3e raadt. Daarna geen bonus meer.
export const PLACEMENT_BONUS = [300, 200, 100];

// De tekenaar krijgt dit per persoon die zijn tekening raadt.
export const DRAWER_POINTS_PER_GUESS = 100;

export const MAX_TIME_POINTS = 1000;

/**
 * Punten op basis van de resterende tijd, omgerekend naar een schaal van 1000.
 * Voorbeeld: 15 van de 60 seconden over => 15/60 = 25% => 250 punten.
 */
export function calcTimePoints(msLeft, totalMs) {
  if (!totalMs || totalMs <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, msLeft / totalMs));
  return Math.round(ratio * MAX_TIME_POINTS);
}

/** Bonus voor de plaats waarop je geraden hebt (rank begint bij 1). */
export function placementBonus(rank) {
  return PLACEMENT_BONUS[rank - 1] || 0;
}

/** Wat de tekenaar verdient als `guessCount` mensen het woord raden. */
export function drawerPoints(guessCount) {
  return guessCount * DRAWER_POINTS_PER_GUESS;
}

/** Zet de spelers-map om naar een gesorteerde lijst (hoogste score eerst). */
export function toRanking(players = {}) {
  return Object.entries(players)
    .map(([id, p]) => ({ id, ...p, name: p.name || "Speler", score: p.score || 0 }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
