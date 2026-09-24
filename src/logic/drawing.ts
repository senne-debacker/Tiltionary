// Sends the drawing to Firebase and reads it back.

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
 * Sends only the new points of a line, each at its own index. Sending the
 * whole line every time made each update bigger and made the ball stutter.
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

/** Removes every line of the drawing. */
export function clearDrawing({ code }: { code: string }): Promise<void> {
  if (!code) return Promise.resolve();
  return remove(ref(db, `rooms/${code}/drawing/paths`));
}

/** Removes exactly one line, for the undo button. */
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
 * Shares the size of the drawer's canvas. Guessers use it as the viewBox, so
 * the drawing fits a phone with a different screen size.
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
 * Firebase returns lists as an array or as an object with gaps. This always
 * returns a clean array.
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
