// src/logic/drawing.ts
// Het versturen en uitlezen van de tekening.

import { ref, update, remove } from "firebase/database";
import { db } from "../../firebaseConfig";
import type { DrawPath, Point } from "@/types/game";

type SyncPointsArgs = {
  code: string;
  pathIndex: number;
  startIndex: number;
  points: Point[];
  color: string;
};

/**
 * Stuurt ALLEEN de nieuwe punten van een lijn naar Firebase, elk op hun eigen
 * index. Vroeger werd steeds de hele puntenlijst opnieuw verstuurd, waardoor
 * lange lijnen het balletje deden haperen: het bericht werd elke sync groter.
 */
export function syncPoints({
  code,
  pathIndex,
  startIndex,
  points,
  color,
}: SyncPointsArgs): Promise<void> {
  if (!code || !points?.length) return Promise.resolve();

  const base = `rooms/${code}/drawing/paths/${pathIndex}`;
  const updates: Record<string, unknown> = { [`${base}/color`]: color };
  points.forEach((point, i) => {
    updates[`${base}/points/${startIndex + i}`] = point;
  });

  return update(ref(db), updates);
}

export function clearDrawing({ code }: { code: string }): Promise<void> {
  if (!code) return Promise.resolve();
  return remove(ref(db, `rooms/${code}/drawing/paths`));
}

/** Verwijdert precies één lijn (voor de "Ongedaan maken"-knop). */
export function undoLastPath({
  code,
  pathIndex,
}: {
  code: string;
  pathIndex: number | null;
}): Promise<void> {
  if (!code || pathIndex == null || pathIndex < 0) return Promise.resolve();
  return remove(ref(db, `rooms/${code}/drawing/paths/${pathIndex}`));
}

/**
 * De tekenaar deelt hoe groot zijn canvas is. De raders gebruiken dat als
 * viewBox, zodat de tekening ook klopt op een telefoon met een ander scherm.
 */
export function publishCanvasSize({
  code,
  width,
  height,
}: {
  code: string;
  width: number;
  height: number;
}): Promise<void> {
  if (!code || !width || !height) return Promise.resolve();
  return update(ref(db, `rooms/${code}/drawing/canvas`), { width, height });
}

/**
 * Firebase geeft lijsten soms terug als object (met gaten) en soms als array.
 * Dit maakt er altijd een nette array van.
 */
export function normalizePaths(
  raw: DrawPath[] | Record<string, DrawPath> | null | undefined,
): DrawPath[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : Object.values(raw);

  return list
    .filter((path): path is DrawPath => !!path && !!path.points)
    .map((path) => ({
      color: path.color,
      points: (Array.isArray(path.points)
        ? path.points
        : Object.values(path.points as Record<string, Point>)
      ).filter(Boolean),
    }))
    .filter((path) => path.points.length > 0);
}
