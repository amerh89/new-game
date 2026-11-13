export type Side = "white" | "black";

/** One move with a plain-language reason. */
export interface MoveNote {
  san: string;
  /** "Why this move" — shown in the explorer and as a hint while learning. */
  why: string;
  /** Optional idea arrows shown after the move, e.g. ["c3d4", "f1e1"]. */
  arrows?: string[];
}

/** Compact authoring form: [san, why] or [san, why, arrows]. */
export type MoveTuple = [san: string, why: string, arrows?: string[]];

export interface CuratedLineSource {
  id: string;
  name: string;
  /** One or two sentences on when this line happens. */
  intro: string;
  moves: MoveTuple[];
}

export type OpeningGroup = "white" | "black-e4" | "black-d4" | "recognize";

export interface OpeningTrapNote {
  name: string;
  /** "for" = you set it; "against" = you must avoid it. */
  kind: "for" | "against";
  text: string;
  /** Links to a full lesson in the Checkmates section. */
  trapId?: string;
}

export interface CuratedOpening {
  id: string;
  name: string;
  eco: string;
  /** The side you play in this opening. */
  side: Side;
  group: OpeningGroup;
  /** false = "recognise only": explained, but not part of the starter training plan. */
  trainable: boolean;
  tagline: string;
  summary: string;
  ideas: string[];
  plans: string[];
  mainLine: CuratedLineSource;
  /** Opponent deviations (for trainable openings your own moves stay consistent). */
  sidelines: CuratedLineSource[];
  mistakes: { title: string; text: string }[];
  traps: OpeningTrapNote[];
}

export interface Trap {
  id: string;
  name: string;
  /** The side that wins — the side you play in "Play it yourself". */
  winner: Side;
  /** true = the line must end in checkmate (checked by npm run validate). */
  mate: boolean;
  summary: string;
  moves: MoveTuple[];
  /** Index (0-based ply) of the losing mistake. */
  blunderPly: number;
  /** Index (0-based ply) of the first punishing move — used by "Spot the trap". */
  keyPly: number;
  defend: {
    text: string;
    /** Ply where the defender should play differently. */
    atPly: number;
    /** A good move to play instead (SAN). */
    better: string;
    why: string;
  };
}

export interface PatternExercise {
  fen: string;
  prompt: string;
  /** Full solution in SAN, starting with your move, including the replies. */
  moves: string[];
}

export interface MatePattern {
  id: string;
  name: string;
  summary: string;
  /** What to look for on the board. */
  recognise: string[];
  lesson: { fen: string; moves: MoveTuple[] };
  exercises: PatternExercise[];
}

/** A row of data/openings.json (built by scripts/build-openings.ts). */
export interface LibraryOpening {
  id: string;
  eco: string;
  name: string;
  family: string;
  variation: string;
  moves: string;
  fen: string;
  side: Side;
}

/** A row of data/puzzles.json (built by scripts/build-puzzles.ts). */
export interface Puzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  mateIn: 1 | 2 | 3;
  openingTags: string[];
}
