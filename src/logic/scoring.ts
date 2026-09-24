// All scoring rules in one place, so the rest of the app never calculates
// points itself.

import type { PlayerMap, RankedPlayer } from "@/types/game";

/** Bonus for the first, second and third correct guess. */
export const PLACEMENT_BONUS = [300, 200, 100];

/** Points the drawer earns per player who guesses the word. */
export const DRAWER_POINTS_PER_GUESS = 100;

export const MAX_TIME_POINTS = 1000;

/**
 * Returns points for the time left, on a scale up to 1000.
 * For example, 15 of 60 seconds left is 25%, which gives 250 points.
 */
export function calcTimePoints(msLeft: number, totalMs: number): number {
  if (!totalMs || totalMs <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, msLeft / totalMs));
  return Math.round(ratio * MAX_TIME_POINTS);
}

/** Returns the bonus for a guess rank, where rank 1 is the first guess. */
export function placementBonus(rank: number): number {
  return PLACEMENT_BONUS[rank - 1] || 0;
}

/** Returns what the drawer earns when `guessCount` players guess the word. */
export function drawerPoints(guessCount: number): number {
  return guessCount * DRAWER_POINTS_PER_GUESS;
}

/** Turns the player map into a list sorted by score, highest first. */
export function toRanking(players: PlayerMap = {}): RankedPlayer[] {
  return Object.entries(players)
    .map(([id, p]) => ({
      ...p,
      id,
      name: p.name || "Speler",
      score: p.score || 0,
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
