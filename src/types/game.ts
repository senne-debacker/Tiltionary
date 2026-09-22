// src/types/game.ts
// De vorm van alles wat in Firebase staat. Firebase geeft `any` terug bij het
// uitlezen, dus casten we daar één keer naar deze types — zo blijft de rest van
// de app getypeerd in plaats van overal optional chaining op onbekende data.

/** Fases die een kamer doorloopt. Bepaalt ook welk scherm je ziet. */
export type GameStatus =
  | "lobby"
  | "announcement"
  | "choosing"
  | "playing"
  | "turnResult"
  | "podium";

export type Point = { x: number; y: number };

export type DrawPath = {
  color: string;
  points: Point[];
};

export type Player = {
  name: string;
  isHost: boolean;
  score: number;
  joinedAt?: number;
};

/** Spelers staan in Firebase als object, met hun id als sleutel. */
export type PlayerMap = Record<string, Player>;

export type RoomSettings = {
  maxRounds: number;
  timerSeconds: number;
  wordPack: string;
};

export type GameState = {
  status: GameStatus;
  currentRound: number;
  turnIndex: number;
  currentDrawerId: string;
  currentWord: string;
  phaseEndsAt: number;
  turnDurationMs: number;
  turnOrder?: string[];
  wordChoices?: string[];
  usedWords?: Record<string, boolean>;
  lastDrawerBonus?: number;
  /** Tijdstip waarop de host naar de achtergrond ging; null als hij er is. */
  hostAwaySince?: number | null;
};

/** Wat er van een speler wordt bijgehouden zodra die het woord raadt. */
export type GuessEntry = {
  rank: number;
  name: string;
  timePoints: number;
  bonus: number;
  points: number;
  at: number;
};

export type GuessedMap = Record<string, GuessEntry>;

export type ChatMessageType = "chat" | "guess" | "system";

export type ChatMessage = {
  type: ChatMessageType;
  text: string;
  at: number;
  name?: string;
  playerId?: string;
  /** Alleen voor systeemberichten: kleurt het bericht. */
  tone?: "info" | "success";
};

/** Chatberichten staan in Firebase als object, met een push-id als sleutel. */
export type ChatMap = Record<string, ChatMessage>;

/** Een chatbericht zoals de UI het nodig heeft: met zijn id erbij. */
export type ChatMessageWithId = ChatMessage & { id: string };

export type RoomDrawing = {
  paths?: DrawPath[] | Record<string, DrawPath>;
  canvas?: { width: number; height: number };
};

/** Een speler in een ranglijst: samengevoegd met zijn id en veilige defaults. */
export type RankedPlayer = Player & { id: string };
