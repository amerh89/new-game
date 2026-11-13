import { describe, expect, it } from "vitest";
import puzzlesJson from "../data/puzzles.json";
import { formatOpeningTag, puzzleHint, puzzleIntro, startPuzzle, submitPuzzleMove } from "@/lib/puzzle";
import { uciToInput } from "@/lib/chess-utils";
import type { Puzzle } from "@/lib/types";

const puzzles = puzzlesJson as Puzzle[];

// Back-rank mate in 1. FEN is BEFORE Black's blunder ...Ra2; White then mates.
const mateIn1: Puzzle = {
  id: "t1",
  fen: "r5k1/5ppp/8/8/8/8/5PPP/3R2K1 b - - 0 1",
  moves: ["a8a2", "d1d8"],
  rating: 600,
  mateIn: 1,
  openingTags: [],
};

// Mate in 2: 1.Qe8+ Rxe8 2.Rxe8#. The opponent's first move is ...Kh8-g8.
const mateIn2: Puzzle = {
  id: "t2",
  fen: "3r3k/5ppp/8/8/8/8/4QPPP/4R1K1 b - - 0 1",
  moves: ["h8g8", "e2e8", "d8e8", "e1e8"],
  rating: 900,
  mateIn: 2,
  openingTags: ["Italian_Game"],
};

// Two different mates in one: Qh8# (solution) and Qa8#.
const twoMates: Puzzle = {
  id: "t3",
  fen: "4k3/8/3K4/8/8/8/8/7Q b - - 0 1",
  moves: ["e8d8", "h1h8"],
  rating: 700,
  mateIn: 1,
  openingTags: [],
};

describe("puzzle move handling", () => {
  it("auto-plays the opponent's first move before you move", () => {
    const intro = puzzleIntro(mateIn1);
    expect(intro.fen).toBe(mateIn1.fen);
    expect(intro.opponentMove).toMatchObject({ from: "a8", to: "a2", san: "Ra2" });

    const state = startPuzzle(mateIn1);
    expect(state.index).toBe(1);
    expect(state.userSide).toBe("white");
    expect(state.fen).toBe(intro.opponentMove.fen);
    expect(state.lastMove).toEqual({ from: "a8", to: "a2" });
    expect(state.status).toBe("playing");
  });

  it("works out which side you play from the position, not the FEN's first mover", () => {
    const blackToSolve: Puzzle = {
      id: "t4",
      fen: "6k1/5ppp/8/8/8/8/5PPP/3r2K1 w - - 0 1".replace("3r2K1", "r5K1").replace("r5K1", "6K1").replace("6k1/5ppp", "r5k1/5ppp"),
      moves: ["g1h1", "a8a1"],
      rating: 600,
      mateIn: 1,
      openingTags: [],
    };
    expect(startPuzzle(blackToSolve).userSide).toBe("black");
  });

  it("solves a mate in 1", () => {
    const result = submitPuzzleMove(startPuzzle(mateIn1), { from: "d1", to: "d8" });
    expect(result.kind).toBe("solved");
    expect(result.state.status).toBe("solved");
    if (result.kind === "solved") expect(result.userMove.san).toBe("Rd8#");
  });

  it("rejects a wrong move, keeps the position and counts the mistake", () => {
    const start = startPuzzle(mateIn1);
    const result = submitPuzzleMove(start, { from: "d1", to: "d7" });
    expect(result.kind).toBe("wrong");
    expect(result.state.fen).toBe(start.fen);
    expect(result.state.mistakes).toBe(1);
    expect(result.state.status).toBe("playing");
    // …and you can retry.
    expect(submitPuzzleMove(result.state, { from: "d1", to: "d8" }).kind).toBe("solved");
  });

  it("rejects illegal moves without crashing", () => {
    const result = submitPuzzleMove(startPuzzle(mateIn1), { from: "d1", to: "h5" });
    expect(result.kind).toBe("wrong");
  });

  it("plays the opponent's reply in a mate in 2", () => {
    let state = startPuzzle(mateIn2);
    const first = submitPuzzleMove(state, { from: "e2", to: "e8" });
    expect(first.kind).toBe("correct");
    if (first.kind !== "correct") return;
    expect(first.userMove.san).toBe("Qe8+");
    expect(first.reply).toMatchObject({ from: "d8", to: "e8", san: "Rxe8" });
    state = first.state;
    expect(state.index).toBe(3);
    expect(state.lastMove).toEqual({ from: "d8", to: "e8" });

    const second = submitPuzzleMove(state, { from: "e1", to: "e8" });
    expect(second.kind).toBe("solved");
  });

  it("accepts a different move if it is also checkmate", () => {
    const result = submitPuzzleMove(startPuzzle(twoMates), { from: "h1", to: "a8" });
    expect(result.kind).toBe("solved");
  });

  it("gives the next expected move as a hint", () => {
    const state = startPuzzle(mateIn2);
    expect(puzzleHint(state)).toEqual({ from: "e2", to: "e8", promotion: undefined });
    const solved = submitPuzzleMove(startPuzzle(mateIn1), { from: "d1", to: "d8" }).state;
    expect(puzzleHint(solved)).toBeUndefined();
  });

  it("ignores moves after the puzzle is solved", () => {
    const solved = submitPuzzleMove(startPuzzle(mateIn1), { from: "d1", to: "d8" }).state;
    expect(submitPuzzleMove(solved, { from: "g1", to: "h1" }).kind).toBe("wrong");
  });

  it("formats opening tags", () => {
    expect(formatOpeningTag("Caro-Kann_Defense_Advance_Variation")).toBe("Caro-Kann Defense Advance Variation");
  });
});

describe("puzzle data", () => {
  it("has about 1,500 puzzles balanced across mate in 1, 2 and 3", () => {
    expect(puzzles.length).toBeGreaterThanOrEqual(1400);
    for (const n of [1, 2, 3]) {
      const count = puzzles.filter((p) => p.mateIn === n).length;
      expect(count).toBeGreaterThanOrEqual(450);
      expect(count).toBeLessThanOrEqual(550);
    }
    expect(puzzles.every((p) => p.rating >= 600 && p.rating <= 1500)).toBe(true);
    expect(puzzles.filter((p) => p.openingTags.length > 0).length).toBeGreaterThan(300);
  });

  it("every puzzle can be solved by playing its solution through the engine", () => {
    for (const puzzle of puzzles) {
      let state = startPuzzle(puzzle);
      let guard = 0;
      while (state.status === "playing" && guard++ < 5) {
        const hint = puzzleHint(state);
        expect(hint).toBeDefined();
        const result = submitPuzzleMove(state, uciToInput(puzzle.moves[state.index]));
        expect(result.kind === "wrong" ? `${puzzle.id} rejected` : "ok").toBe("ok");
        state = result.state;
      }
      expect(state.status).toBe("solved");
    }
  });
});
