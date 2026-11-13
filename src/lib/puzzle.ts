import { Chess } from "chess.js";
import { inputToUci, uciToInput, type MoveInput } from "./chess-utils";
import type { Puzzle, Side } from "./types";

/**
 * Lichess puzzle format:
 *  - `fen` is the position BEFORE the opponent's move.
 *  - `moves[0]` is the opponent's move and is played automatically.
 *  - From then on moves alternate: yours, opponent's, yours, …
 */
export interface PuzzleState {
  puzzle: Puzzle;
  /** Current position. */
  fen: string;
  /** Index into puzzle.moves of the next move to be played. */
  index: number;
  userSide: Side;
  lastMove?: { from: string; to: string };
  status: "playing" | "solved";
  mistakes: number;
}

export interface PuzzleStep {
  from: string;
  to: string;
  san: string;
  fen: string;
  captured: boolean;
  check: boolean;
}

function applyUci(chess: Chess, uci: string): PuzzleStep {
  const move = chess.move(uciToInput(uci));
  return {
    from: move.from,
    to: move.to,
    san: move.san,
    fen: chess.fen(),
    captured: Boolean(move.captured),
    check: move.san.includes("+") || move.san.includes("#"),
  };
}

/** The position to show first, before the opponent's move is animated. */
export function puzzleIntro(puzzle: Puzzle): { fen: string; opponentMove: PuzzleStep } {
  const chess = new Chess(puzzle.fen);
  return { fen: puzzle.fen, opponentMove: applyUci(chess, puzzle.moves[0]) };
}

/** Starts a puzzle with the opponent's first move already played. */
export function startPuzzle(puzzle: Puzzle): PuzzleState {
  const { opponentMove } = puzzleIntro(puzzle);
  return {
    puzzle,
    fen: opponentMove.fen,
    index: 1,
    userSide: opponentMove.fen.split(" ")[1] === "w" ? "white" : "black",
    lastMove: { from: opponentMove.from, to: opponentMove.to },
    status: "playing",
    mistakes: 0,
  };
}

export type PuzzleResult =
  | { kind: "wrong"; state: PuzzleState }
  | { kind: "correct"; state: PuzzleState; userMove: PuzzleStep; reply: PuzzleStep }
  | { kind: "solved"; state: PuzzleState; userMove: PuzzleStep };

/**
 * Submits your move.
 * The expected move is always accepted. A different move is also accepted if it
 * gives checkmate on the spot (the Lichess rule for mate puzzles).
 */
export function submitPuzzleMove(state: PuzzleState, attempt: MoveInput): PuzzleResult {
  if (state.status === "solved") return { kind: "wrong", state };

  const chess = new Chess(state.fen);
  let userMove: PuzzleStep;
  try {
    const move = chess.move({ ...attempt, promotion: attempt.promotion ?? "q" });
    userMove = {
      from: move.from,
      to: move.to,
      san: move.san,
      fen: chess.fen(),
      captured: Boolean(move.captured),
      check: move.san.includes("+") || move.san.includes("#"),
    };
  } catch {
    return { kind: "wrong", state: { ...state, mistakes: state.mistakes + 1 } };
  }

  const expected = state.puzzle.moves[state.index];
  const played = inputToUci({ from: userMove.from, to: userMove.to, promotion: attempt.promotion });
  const matches =
    played === expected || (expected.length === 5 && `${userMove.from}${userMove.to}${attempt.promotion ?? "q"}` === expected);
  const isMate = chess.isCheckmate();

  if (!matches && !isMate) {
    return { kind: "wrong", state: { ...state, mistakes: state.mistakes + 1 } };
  }

  const lastUserMove = { from: userMove.from, to: userMove.to };
  const isLast = state.index >= state.puzzle.moves.length - 1;
  if (isMate || isLast) {
    return {
      kind: "solved",
      userMove,
      state: {
        ...state,
        fen: userMove.fen,
        index: state.puzzle.moves.length,
        lastMove: lastUserMove,
        status: "solved",
      },
    };
  }

  const reply = applyUci(chess, state.puzzle.moves[state.index + 1]);
  return {
    kind: "correct",
    userMove,
    reply,
    state: {
      ...state,
      fen: reply.fen,
      index: state.index + 2,
      lastMove: { from: reply.from, to: reply.to },
    },
  };
}

/** The move you are expected to play next (for the hint arrow). */
export function puzzleHint(state: PuzzleState): MoveInput | undefined {
  if (state.status === "solved") return undefined;
  const uci = state.puzzle.moves[state.index];
  return uci ? uciToInput(uci) : undefined;
}

/** "Italian_Game" -> "Italian Game" */
export function formatOpeningTag(tag: string): string {
  return tag.replace(/_/g, " ");
}

/** The family tag is the first (shortest) entry in the Lichess OpeningTags list. */
export function puzzleFamily(puzzle: Puzzle): string | undefined {
  return puzzle.openingTags[0];
}
