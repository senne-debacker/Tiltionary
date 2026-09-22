// src/hooks/useServerTime.js
// Elke telefoon loopt een beetje voor of achter. Firebase geeft ons het
// verschil met de servertijd, zodat alle spelers dezelfde klok gebruiken en
// iedereen exact tegelijk 0 op de timer ziet.

import { useCallback, useEffect, useRef, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../../firebaseConfig";

export function useServerTime() {
  const offsetRef = useRef(0);

  useEffect(() => {
    const unsubscribe = onValue(ref(db, ".info/serverTimeOffset"), (snap) => {
      offsetRef.current = snap.val() || 0;
    });
    return () => unsubscribe();
  }, []);

  // Stabiele functie: verandert nooit, dus veilig in dependency arrays.
  return useCallback(() => Date.now() + offsetRef.current, []);
}

/** Aftellen naar een absoluut tijdstip. Geeft de resterende milliseconden. */
export function useCountdown(endsAt, serverNow, intervalMs = 200) {
  const [msLeft, setMsLeft] = useState(0);

  useEffect(() => {
    if (!endsAt) {
      setMsLeft(0);
      return;
    }
    const tick = () => setMsLeft(Math.max(0, endsAt - serverNow()));
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [endsAt, serverNow, intervalMs]);

  return msLeft;
}
