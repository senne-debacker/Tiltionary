// src/hooks/use-server-time.ts
// Elke telefoon loopt een beetje voor of achter. Firebase geeft ons het
// verschil met de servertijd, zodat alle spelers dezelfde klok gebruiken en
// iedereen exact tegelijk 0 op de timer ziet.
//
// De listener wordt één keer opgezet (bij het eerste gebruik) en gedeeld door
// de hele app — niet per scherm, anders open je hem meerdere keren.

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../../firebaseConfig";

let offset = 0;
let listening = false;

function ensureListening() {
  if (listening) return;
  listening = true;
  onValue(ref(db, ".info/serverTimeOffset"), (snap) => {
    offset = (snap.val() as number | null) ?? 0;
  });
}

/** De huidige tijd volgens de server, in ms. */
export function serverNow(): number {
  ensureListening();
  return Date.now() + offset;
}

/** Aftellen naar een absoluut tijdstip. Geeft de resterende milliseconden. */
export function useCountdown(
  endsAt: number | undefined | null,
  intervalMs = 200,
): number {
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
  }, [endsAt, intervalMs]);

  return msLeft;
}
