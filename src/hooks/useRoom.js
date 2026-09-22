// src/hooks/useRoom.js
// Luistert naar de kamer in losse stukken (gameState / players / settings).
// Bewust NIET naar de hele kamer in één listener: tijdens het tekenen worden
// de lijnen 10x per seconde bijgewerkt, en dan zou de hele app steeds
// opnieuw renderen.

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../../firebaseConfig";

export default function useRoom(code) {
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState({});
  const [settings, setSettings] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!code) {
      setGameState(null);
      setPlayers({});
      setSettings(null);
      setLoaded(false);
      return;
    }

    const unsubscribers = [
      onValue(ref(db, `rooms/${code}/gameState`), (snap) => {
        setGameState(snap.val());
        setLoaded(true);
      }),
      onValue(ref(db, `rooms/${code}/players`), (snap) => {
        setPlayers(snap.val() || {});
      }),
      onValue(ref(db, `rooms/${code}/settings`), (snap) => {
        setSettings(snap.val());
      }),
    ];

    return () => unsubscribers.forEach((off) => off());
  }, [code]);

  return { gameState, players, settings, loaded };
}
