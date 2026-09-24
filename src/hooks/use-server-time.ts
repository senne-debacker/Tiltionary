// A shared clock. Every phone runs slightly fast or slow, and Firebase reports
// the offset to its server time, so all timers hit zero at the same moment.
//
// The offset listener opens once, on first use, and the whole app shares it.

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

/** Returns the current server time in milliseconds. */
export function serverNow(): number {
  ensureListening();
  return Date.now() + offset;
}

/** Counts down to an absolute time and returns the milliseconds left. */
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
