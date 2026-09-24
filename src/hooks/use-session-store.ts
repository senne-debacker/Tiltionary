// Who you are and which room you are in. This is local to this device and is
// not stored in Firebase.
//
// It is a store instead of props because Expo Router renders the screens,
// so they cannot receive props. Each screen reads what it needs from here.

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

/** Store with this device's session. Empty while on the home screen. */
export const useSessionStore = create<SessionState>()((set) => ({
  ...EMPTY,
  setSession: (session) => set(session),
  clearSession: () => set(EMPTY),
}));
