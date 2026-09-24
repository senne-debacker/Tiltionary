// Latest snapshot of the current room, as it lives in Firebase.
// Filled by useRoomSubscription and read by every room screen.

import { create } from "zustand";
import type {
  ChatMap,
  ChatMessageWithId,
  GameState,
  GuessedMap,
  PlayerMap,
  RoomDrawing,
  RoomSettings,
} from "@/types/game";

type RoomState = {
  gameState: GameState | null;
  players: PlayerMap;
  settings: RoomSettings | null;
  chat: ChatMap;
  guessed: GuessedMap;
  drawing: RoomDrawing | null;
  /** Whether the first snapshot arrived. Before that, "no room" is unknown. */
  loaded: boolean;
  setGameState: (gameState: GameState | null) => void;
  setPlayers: (players: PlayerMap) => void;
  setSettings: (settings: RoomSettings | null) => void;
  setChat: (chat: ChatMap) => void;
  setGuessed: (guessed: GuessedMap) => void;
  setDrawing: (drawing: RoomDrawing | null) => void;
  reset: () => void;
};

const EMPTY = {
  gameState: null,
  players: {},
  settings: null,
  chat: {},
  guessed: {},
  drawing: null,
  loaded: false,
};

/** Store with the current room. Read it with a selector. */
export const useRoomStore = create<RoomState>()((set) => ({
  ...EMPTY,
  setGameState: (gameState) => set({ gameState, loaded: true }),
  setPlayers: (players) => set({ players }),
  setSettings: (settings) => set({ settings }),
  setChat: (chat) => set({ chat }),
  setGuessed: (guessed) => set({ guessed }),
  setDrawing: (drawing) => set({ drawing }),
  reset: () => set(EMPTY),
}));

/** Returns the chat as a list sorted from oldest to newest. */
export function useChatMessages(): ChatMessageWithId[] {
  const chat = useRoomStore((state) => state.chat);

  return Object.entries(chat)
    .map(([id, message]) => ({ ...message, id }))
    .sort((a, b) => (a.at || 0) - (b.at || 0));
}
