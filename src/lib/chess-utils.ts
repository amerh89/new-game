import { Chess, type Move, type Square } from "chess.js";

export const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** Position identity that ignores the move counters. */
export function fenKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

export interface MoveInput {
  from: string;
  to: string;
  promotion?: string;
}

export interface ReplayedMove {
  san: string;
  from: string;
  to: string;
  promotion?: string;
  color: "w" | "b";
  captured: boolean;
  check: boolean;
  /** Position before the move. */
  before: string;
  /** Position after the move. */
  after: string;
}

export function toReplayedMove(move: Move): ReplayedMove {
  return {
    san: move.san,
    from: move.from,
    to: move.to,
    promotion: move.promotion,
    color: move.color,
    captured: Boolean(move.captured),
    check: move.san.includes("+") || move.san.includes("#"),
    before: move.before,
    after: move.after,
  };
}

/**
 * Replays SAN moves from a starting position.
 * Throws an Error naming the bad move if any move is illegal.
 */
export function replaySan(sans: string[], startFen: string = START_FEN): ReplayedMove[] {
  const chess = new Chess(startFen);
  const out: ReplayedMove[] = [];
  sans.forEach((san, i) => {
    let move: Move;
    try {
      move = chess.move(san);
    } catch {
      throw new Error(`Illegal move "${san}" at ply ${i + 1} (after ${sans.slice(0, i).join(" ") || "start"})`);
    }
    out.push(toReplayedMove(move));
  });
  return out;
}

export function uciToInput(uci: string): MoveInput {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  };
}

export function inputToUci(move: MoveInput): string {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}

/** Tries a move on a position. Returns null when it is illegal. */
export function tryMove(fen: string, input: MoveInput): ReplayedMove | null {
  const chess = new Chess(fen);
  try {
    return toReplayedMove(chess.move({ ...input }));
  } catch {
    return null;
  }
}

/** Tries a move written in SAN (e.g. "Nf3"). Returns null when it is illegal. */
export function trySan(fen: string, san: string): ReplayedMove | null {
  const chess = new Chess(fen);
  try {
    return toReplayedMove(chess.move(san));
  } catch {
    return null;
  }
}

/** True when moving this piece to this square is a pawn promotion. */
export function isPromotion(fen: string, from: string, to: string): boolean {
  const chess = new Chess(fen);
  const piece = chess.get(from as Square);
  if (!piece || piece.type !== "p") return false;
  return (piece.color === "w" && to[1] === "8") || (piece.color === "b" && to[1] === "1");
}

export function legalTargets(fen: string, from: string): string[] {
  const chess = new Chess(fen);
  try {
    return chess.moves({ square: from as Square, verbose: true }).map((m) => m.to);
  } catch {
    return [];
  }
}

export function sideToMove(fen: string): "white" | "black" {
  return fen.split(" ")[1] === "b" ? "black" : "white";
}

/** "1.e4 e5 2.Nf3" style text for a list of SAN moves. */
export function formatMoves(sans: string[], startPly = 0): string {
  const parts: string[] = [];
  sans.forEach((san, i) => {
    const ply = startPly + i;
    if (ply % 2 === 0) parts.push(`${ply / 2 + 1}.${san}`);
    else if (i === 0) parts.push(`${(ply - 1) / 2 + 1}...${san}`);
    else parts.push(san);
  });
  return parts.join(" ");
}

/** Deterministic PRNG (mulberry32) so quizzes and tests can be seeded. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pick<T>(items: readonly T[], rng: () => number = Math.random): T {
  return items[Math.floor(rng() * items.length)];
}
