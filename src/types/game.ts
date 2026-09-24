// The shape of everything stored in Firebase. Firebase returns untyped data,
// so it is cast to these types once, where it is read. The rest of the app
// then works with real types.

/** Phases a room goes through. Each phase has its own screen. */
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

/** Players are stored as an object keyed by player id. */
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
  /** When the host went to the background, or null while the host is here. */
  hostAwaySince?: number | null;
};

/** What is stored for a player once they guess the word. */
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
  /** System messages only: sets the color of the message. */
  tone?: "info" | "success";
};

/** Chat messages are stored as an object keyed by push id. */
export type ChatMap = Record<string, ChatMessage>;

/** A chat message with its id, as the UI needs it. */
export type ChatMessageWithId = ChatMessage & { id: string };

export type RoomDrawing = {
  paths?: DrawPath[] | Record<string, DrawPath>;
  canvas?: { width: number; height: number };
};

/** A player in a ranking, with its id and safe defaults filled in. */
export type RankedPlayer = Player & { id: string };
