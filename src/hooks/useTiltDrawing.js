// src/hooks/useTiltDrawing.js
// Het tekenen zelf: kantel de telefoon om het balletje te rollen, tik om je
// pen op te tillen. Wissen en ongedaan maken gaan via expliciete knoppen
// (clear()/undo()) in plaats van een schudgebaar — dat triggerde te makkelijk
// per ongeluk tijdens gewoon tekenen.
//
// De hook werkt met refs in plaats van state binnen de accelerometer-listener,
// omdat die 60x per seconde afgaat. State daarin uitlezen zou verouderde
// waarden geven (stale closure).

import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions } from "react-native";
import { Accelerometer } from "expo-sensors";
import * as Haptics from "expo-haptics";
import { INK } from "../theme";

const screen = Dimensions.get("window");

export const BALL_RADIUS = 10;
const SENSITIVITY = 15;
const MIN_POINT_DISTANCE = 2; // pas een punt opslaan na deze afstand
const SYNC_INTERVAL_MS = 100; // hoe vaak we naar Firebase sturen
const UPDATE_INTERVAL_MS = 16; // ~60 fps

export default function useTiltDrawing({
  enabled = true,
  color = INK, // huidige inktkleur; wisselen splitst de lopende lijn meteen
  onSyncPoints, // ({ pathIndex, startIndex, points, color }) => void
  onClearRemote, // () => void
  onUndoRemote, // (removedPathIndex) => void
} = {}) {
  const [paths, setPaths] = useState([]);
  const [position, setPosition] = useState({
    x: screen.width / 2,
    y: screen.height / 2,
  });
  const [drawState, setDrawState] = useState("waiting"); // 'waiting' | 'drawing'
  const [isPenLifted, setIsPenLifted] = useState(false);

  const posRef = useRef(position);
  const pathsRef = useRef([]);
  const drawStateRef = useRef("waiting");
  const penLiftedRef = useRef(false);
  const boundsRef = useRef({ width: screen.width, height: screen.height });
  const colorRef = useRef(color);
  colorRef.current = color;

  // Bijhouden wat er al naar Firebase gestuurd is, zodat we alleen de NIEUWE
  // punten versturen in plaats van elke keer de hele (groeiende) lijn.
  const lastSyncTime = useRef(0);
  const syncedPathIndexRef = useRef(-1);
  const syncedPointCountRef = useRef(0);

  // Callbacks in een ref: de listener hieronder mag niet opnieuw opgebouwd
  // worden telkens als de parent rendert.
  const callbacks = useRef({ onSyncPoints, onClearRemote, onUndoRemote });
  callbacks.current = { onSyncPoints, onClearRemote, onUndoRemote };

  useEffect(() => {
    pathsRef.current = paths;
  }, [paths]);
  useEffect(() => {
    drawStateRef.current = drawState;
  }, [drawState]);
  useEffect(() => {
    penLiftedRef.current = isPenLifted;
  }, [isPenLifted]);

  const resetSyncTracking = () => {
    syncedPathIndexRef.current = -1;
    syncedPointCountRef.current = 0;
    lastSyncTime.current = 0;
  };

  // Een kleurwissel geldt vanaf NU, ook midden in een lijn — niet pas na het
  // optillen van de pen. We knippen de huidige lijn op de plek waar de bal nu
  // staat en beginnen daar een nieuw segment in de nieuwe kleur, zodat het
  // op het scherm als één doorlopende lijn oogt die van kleur verandert.
  const prevColorRef = useRef(color);
  useEffect(() => {
    if (!enabled || prevColorRef.current === color) return;
    prevColorRef.current = color;

    if (drawStateRef.current !== "drawing" || penLiftedRef.current) return;
    if (pathsRef.current.length === 0) return;

    const splitPoint = posRef.current;
    const newPaths = [...pathsRef.current, { color, points: [splitPoint] }];
    pathsRef.current = newPaths;
    setPaths(newPaths);
    // De sync-logica in de accelerometer-listener hieronder merkt vanzelf dat
    // pathIndex nu hoger ligt dan syncedPathIndexRef en start de teller dan
    // opnieuw bij 0 — geen aparte reset hier nodig.
  }, [color, enabled]);

  /** Alles wissen (bij een nieuwe beurt of via de "Wis alles"-knop). */
  const clear = useCallback(({ notifyRemote = false } = {}) => {
    setPaths([]);
    setDrawState("waiting");
    setIsPenLifted(false);
    pathsRef.current = [];
    drawStateRef.current = "waiting";
    penLiftedRef.current = false;
    resetSyncTracking();
    if (notifyRemote) callbacks.current.onClearRemote?.();
  }, []);

  /** Haalt alleen de laatst getekende lijn weg. */
  const undo = useCallback(() => {
    const current = pathsRef.current;
    if (current.length === 0) return;

    const removedIndex = current.length - 1;
    const remaining = current.slice(0, removedIndex);

    setPaths(remaining);
    pathsRef.current = remaining;

    if (remaining.length === 0) {
      // Niets meer over: terug naar "tik om het balletje te laten vallen".
      setDrawState("waiting");
      setIsPenLifted(false);
      drawStateRef.current = "waiting";
      penLiftedRef.current = false;
    } else {
      // Ga verder vanaf het eindpunt van de lijn die nu de laatste is.
      const lastPath = remaining[remaining.length - 1];
      const lastPoint = lastPath.points[lastPath.points.length - 1];
      if (lastPoint) {
        posRef.current = lastPoint;
        setPosition(lastPoint);
      }
      setIsPenLifted(false);
      penLiftedRef.current = false;
    }

    // De verwijderde lijn had index `removedIndex`; als er straks een nieuwe
    // lijn bijkomt, krijgt die dezelfde index opnieuw — dus de synctellers
    // resetten, anders denkt de sync-logica dat die "nieuwe" lijn al voor
    // een deel verstuurd was.
    resetSyncTracking();
    callbacks.current.onUndoRemote?.(removedIndex);
  }, []);

  /** Canvasgrootte onthouden, zodat het balletje binnen het vlak blijft. */
  const handleLayout = useCallback((event) => {
    const { width, height } = event.nativeEvent.layout;
    boundsRef.current = { width, height };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);
    const subscription = Accelerometer.addListener(({ x, y }) => {
      if (drawStateRef.current === "waiting") return;

      const { width, height } = boundsRef.current;
      let newX = posRef.current.x + x * SENSITIVITY;
      let newY = posRef.current.y - y * SENSITIVITY;
      let bounced = false;

      if (newX < BALL_RADIUS) {
        newX = BALL_RADIUS;
        bounced = true;
      }
      if (newX > width - BALL_RADIUS) {
        newX = width - BALL_RADIUS;
        bounced = true;
      }
      if (newY < BALL_RADIUS) {
        newY = BALL_RADIUS;
        bounced = true;
      }
      if (newY > height - BALL_RADIUS) {
        newY = height - BALL_RADIUS;
        bounced = true;
      }

      if (bounced) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const newPos = { x: newX, y: newY };
      posRef.current = newPos;
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
      setPaths(currentPaths);

      // Nieuwe lijn (na optillen)? Teller opnieuw beginnen.
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

  const handleTouchStart = useCallback(
    (event) => {
      if (!enabled) return;
      const { locationX, locationY } = event.nativeEvent;

      if (drawStateRef.current === "waiting") {
        // Eerste tik: laat het balletje vallen waar je tikt.
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const start = { x: locationX, y: locationY };
        posRef.current = start;
        setPosition(start);
        setDrawState("drawing");
        setPaths([{ color: colorRef.current, points: [start] }]);
      } else {
        // Tik tijdens het tekenen: pen omhoog.
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsPenLifted(true);
      }
    },
    [enabled],
  );

  const handleTouchEnd = useCallback(() => {
    if (!enabled) return;
    if (drawStateRef.current !== "drawing" || !penLiftedRef.current) return;

    // Pen weer neer: begin een nieuwe losse lijn vanaf de huidige plek.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPenLifted(false);
    setPaths((prev) => [...prev, { color: colorRef.current, points: [posRef.current] }]);
  }, [enabled]);

  return {
    paths,
    position,
    drawState,
    isPenLifted,
    canUndo: paths.length > 0,
    handleTouchStart,
    handleTouchEnd,
    handleLayout,
    clear,
    undo,
  };
}
