// Drawing by tilting: tilt the phone to roll the ball, tap to lift the pen.
// Clearing and undoing use explicit buttons, because a shake gesture fired
// too easily while drawing.
//
// The accelerometer fires 60 times per second and its listener is created
// once, so it reads refs instead of state to avoid stale values. Every state
// setter below updates its ref at the same moment.

import { useEffect, useRef, useState } from "react";
import { Dimensions } from "react-native";
import { Accelerometer } from "expo-sensors";
import * as Haptics from "expo-haptics";
import { INK_COLORS } from "@/constants/theme";
import type { DrawPath, Point } from "@/types/game";
import type { LayoutChangeEvent, GestureResponderEvent } from "react-native";

/** New points of one line, sent to Firebase in a batch. */
export type SyncPointsPayload = {
  pathIndex: number;
  startIndex: number;
  points: Point[];
  color: string;
};

type DrawState = "waiting" | "drawing";

type TiltDrawingArgs = {
  enabled?: boolean;
  onSyncPoints?: (payload: SyncPointsPayload) => void;
  onClearRemote?: () => void;
  onUndoRemote?: (removedPathIndex: number) => void;
};

const screen = Dimensions.get("window");

export const BALL_RADIUS = 10;
const SENSITIVITY = 15;
/** Minimum distance in px before a new point is stored. */
const MIN_POINT_DISTANCE = 2;
/** How often new points are sent to Firebase. */
const SYNC_INTERVAL_MS = 100;
/** Accelerometer interval, about 60 fps. */
const UPDATE_INTERVAL_MS = 16;

/** Tilt-to-draw state and handlers for a drawing canvas. */
export default function useTiltDrawing({
  enabled = true,
  onSyncPoints,
  onClearRemote,
  onUndoRemote,
}: TiltDrawingArgs = {}) {
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [position, setPosition] = useState<Point>({
    x: screen.width / 2,
    y: screen.height / 2,
  });
  const [drawState, setDrawState] = useState<DrawState>("waiting");
  const [isPenLifted, setIsPenLifted] = useState(false);
  const [color, setColorState] = useState(INK_COLORS[0]);

  const pathsRef = useRef<DrawPath[]>([]);
  const positionRef = useRef(position);
  const drawStateRef = useRef<DrawState>("waiting");
  const penLiftedRef = useRef(false);
  const colorRef = useRef(color);
  const boundsRef = useRef({ width: screen.width, height: screen.height });

  // What was already sent, so only new points go to Firebase instead of
  // the whole growing line.
  const lastSyncTime = useRef(0);
  const syncedPathIndexRef = useRef(-1);
  const syncedPointCountRef = useRef(0);

  // Kept in a ref so the accelerometer listener is not rebuilt whenever the
  // parent re-renders.
  const callbacks = useRef({ onSyncPoints, onClearRemote, onUndoRemote });
  callbacks.current = { onSyncPoints, onClearRemote, onUndoRemote };

  // ---- State and ref together ----

  const updatePaths = (next: DrawPath[]) => {
    pathsRef.current = next;
    setPaths(next);
  };

  const updatePosition = (next: Point) => {
    positionRef.current = next;
    setPosition(next);
  };

  const updateDrawState = (next: DrawState) => {
    drawStateRef.current = next;
    setDrawState(next);
  };

  const updatePenLifted = (next: boolean) => {
    penLiftedRef.current = next;
    setIsPenLifted(next);
  };

  const resetSyncTracking = () => {
    syncedPathIndexRef.current = -1;
    syncedPointCountRef.current = 0;
    lastSyncTime.current = 0;
  };

  // ---- Actions ----

  /**
   * Changes the ink color right away, even in the middle of a line. The line
   * is split at the ball, so it reads as one line that changes color.
   */
  const setColor = (next: string) => {
    if (next === colorRef.current) return;
    colorRef.current = next;
    setColorState(next);

    if (drawStateRef.current !== "drawing" || penLiftedRef.current) return;
    if (pathsRef.current.length === 0) return;

    // The sync logic sees the higher path index and starts a new count.
    updatePaths([...pathsRef.current, { color: next, points: [positionRef.current] }]);
  };

  /** Clears the canvas locally and for the other players. */
  const clear = () => {
    updatePaths([]);
    updateDrawState("waiting");
    updatePenLifted(false);
    resetSyncTracking();
    callbacks.current.onClearRemote?.();
  };

  /** Removes only the most recent line. */
  const undo = () => {
    const current = pathsRef.current;
    if (current.length === 0) return;

    const removedIndex = current.length - 1;
    const remaining = current.slice(0, removedIndex);
    updatePaths(remaining);
    updatePenLifted(false);

    if (remaining.length === 0) {
      updateDrawState("waiting");
    } else {
      // Continue from the end of what is now the last line.
      const lastPath = remaining[remaining.length - 1];
      const lastPoint = lastPath.points[lastPath.points.length - 1];
      if (lastPoint) updatePosition(lastPoint);
    }

    // The next new line reuses the removed index, so the sync counters
    // must start over or it would look partly sent already.
    resetSyncTracking();
    callbacks.current.onUndoRemote?.(removedIndex);
  };

  /** Stores the canvas size so the ball stays inside it. */
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    boundsRef.current = { width, height };
  };

  const handleTouchStart = (event: GestureResponderEvent) => {
    if (!enabled) return;
    const { locationX, locationY } = event.nativeEvent;

    if (drawStateRef.current === "waiting") {
      // First tap drops the ball where the finger is.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const start = { x: locationX, y: locationY };
      updatePosition(start);
      updateDrawState("drawing");
      updatePaths([{ color: colorRef.current, points: [start] }]);
    } else {
      // Any later tap lifts the pen while the finger is down.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updatePenLifted(true);
    }
  };

  const handleTouchEnd = () => {
    if (!enabled) return;
    if (drawStateRef.current !== "drawing" || !penLiftedRef.current) return;

    // Pen down again: start a new line from the current position.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePenLifted(false);
    updatePaths([
      ...pathsRef.current,
      { color: colorRef.current, points: [positionRef.current] },
    ]);
  };

  // ---- Accelerometer ----

  useEffect(() => {
    if (!enabled) return;

    Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);
    const subscription = Accelerometer.addListener(({ x, y }) => {
      if (drawStateRef.current === "waiting") return;

      const { width, height } = boundsRef.current;
      const rawX = positionRef.current.x + x * SENSITIVITY;
      const rawY = positionRef.current.y - y * SENSITIVITY;
      const newX = Math.min(Math.max(rawX, BALL_RADIUS), width - BALL_RADIUS);
      const newY = Math.min(Math.max(rawY, BALL_RADIUS), height - BALL_RADIUS);

      if (newX !== rawX || newY !== rawY) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const newPos = { x: newX, y: newY };
      positionRef.current = newPos;
      setPosition(newPos);

      if (penLiftedRef.current || pathsRef.current.length === 0) return;

      const currentPaths = [...pathsRef.current];
      const pathIndex = currentPaths.length - 1;
      const points = currentPaths[pathIndex].points;
      const lastPoint = points[points.length - 1];

      if (
        !lastPoint ||
        Math.hypot(newX - lastPoint.x, newY - lastPoint.y) <= MIN_POINT_DISTANCE
      ) {
        return;
      }

      points.push(newPos);
      pathsRef.current = currentPaths;
      setPaths(currentPaths);

      // A new line started since the last sync, so count from zero.
      if (syncedPathIndexRef.current !== pathIndex) {
        syncedPathIndexRef.current = pathIndex;
        syncedPointCountRef.current = 0;
      }

      const now = Date.now();
      if (now - lastSyncTime.current < SYNC_INTERVAL_MS) return;

      const newPoints = points.slice(syncedPointCountRef.current);
      if (newPoints.length > 0) {
        callbacks.current.onSyncPoints?.({
          pathIndex,
          startIndex: syncedPointCountRef.current,
          points: newPoints,
          color: currentPaths[pathIndex].color,
        });
        syncedPointCountRef.current = points.length;
      }
      lastSyncTime.current = now;
    });

    return () => subscription.remove();
  }, [enabled]);

  return {
    paths,
    position,
    drawState,
    isPenLifted,
    color,
    canUndo: paths.length > 0,
    setColor,
    handleTouchStart,
    handleTouchEnd,
    handleLayout,
    clear,
    undo,
  };
}
