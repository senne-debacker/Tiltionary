// src/hooks/use-room-store.ts
// De laatste stand van de kamer zoals die in Firebase staat. Wordt gevuld door
// use-room-subscription (één keer, bovenaan) en gelezen door elk scherm.

import { create } from "zustand";
import type { GameState, PlayerMap, RoomSettings } from "@/types/game";

type RoomState = {
  gameState: GameState | null;
  players: PlayerMap;
  settings: RoomSettings | null;
  /** Of de eerste snapshot binnen is; anders weet je niet of de kamer bestaat. */
  loaded: boolean;
  setGameState: (gameState: GameState | null) => void;
  setPlayers: (players: PlayerMap) => void;
  setSettings: (settings: RoomSettings | null) => void;
  reset: () => void;
};

const EMPTY = {
  gameState: null,
  players: {},
  settings: null,
  loaded: false,
};

export const useRoomStore = create<RoomState>()((set) => ({
  ...EMPTY,
  setGameState: (gameState) => set({ gameState, loaded: true }),
  setPlayers: (players) => set({ players }),
  setSettings: (settings) => set({ settings }),
  reset: () => set(EMPTY),
}));
