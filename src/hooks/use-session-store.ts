// src/hooks/use-session-store.ts
// Wie ben jij, en in welke kamer zit je? Dit is puur lokaal (staat niet in
// Firebase) en hoort bij dit toestel.
//
// Waarom een store en geen props: met Expo Router worden schermen door de
// router gerenderd, dus je kan er geen props aan meegeven. Elk scherm haalt
// wat het nodig heeft dus hier op.

import { create } from "zustand";

export type Session = {
  code: string;
  playerId: string;
  nickname: string;
  isHost: boolean;
};

type SessionState = Session & {
  setSession: (session: Session) => void;
  clearSession: () => void;
};

const EMPTY: Session = {
  code: "",
  playerId: "",
  nickname: "",
  isHost: false,
};

export const useSessionStore = create<SessionState>()((set) => ({
  ...EMPTY,
  setSession: (session) => set(session),
  clearSession: () => set(EMPTY),
}));
