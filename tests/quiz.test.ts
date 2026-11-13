import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import openingsJson from "../data/openings.json";
import {
  BALANCED_LINES,
  FAMOUS_OPENINGS,
  generateQuiz,
  makeNameQuestion,
  makeNextMoveQuestion,
  makeSideQuestion,
  makeTrapQuestion,
  nameQuestionPool,
  pickDistractorMoves,
  quizLabel,
  type QuizQuestion,
  type QuizSources,
} from "@/lib/quiz";
import { getCuratedOpenings, getLines, getTrainingLines, getTraps } from "@/lib/curated";
import { createRng, START_FEN } from "@/lib/chess-utils";
import type { LibraryOpening } from "@/lib/types";

const library = openingsJson as LibraryOpening[];
const lines = getCuratedOpenings()
  .filter((o) => o.trainable)
  .flatMap((o) => getTrainingLines(o.id));
const sources: QuizSources = { library, lines, traps: getTraps() };

function expectWellFormed(q: QuizQuestion) {
  expect(q.choices.length).toBeGreaterThanOrEqual(3);
  expect(new Set(q.choices).size).toBe(q.choices.length);
  expect(q.answer).toBeGreaterThanOrEqual(0);
  expect(q.answer).toBeLessThan(q.choices.length);
  expect(q.prompt.length).toBeGreaterThan(5);
  expect(q.explanation.length).toBeGreaterThan(5);
  expect(() => new Chess(q.fen)).not.toThrow();
}

describe("name this opening", () => {
  it("has a healthy pool covering every famous opening", () => {
    const labels = new Set(nameQuestionPool(library).map(quizLabel));
    for (const name of FAMOUS_OPENINGS) expect(labels.has(name), name).toBe(true);
  });

  it("offers 4 different openings and the right one matches the position", () => {
    const rng = createRng(1);
    for (let i = 0; i < 200; i++) {
      const q = makeNameQuestion(library, rng)!;
      expectWellFormed(q);
      expect(q.choices).toHaveLength(4);
      const id = q.id.replace("name:", "");
      const opening = library.find((o) => o.id === id)!;
      expect(q.choices[q.answer]).toBe(quizLabel(opening));
      expect(q.fen).toBe(opening.fen);
    }
  });

  it("returns null when there is nothing to ask", () => {
    expect(makeNameQuestion([], createRng(1))).toBeNull();
  });
});

describe("next move", () => {
  it("the correct choice is the repertoire move and every choice is legal", () => {
    const rng = createRng(2);
    for (let i = 0; i < 200; i++) {
      const q = makeNextMoveQuestion(lines, rng)!;
      expectWellFormed(q);
      expect(q.choices).toHaveLength(4);
      const legal = new Chess(q.fen).moves();
      for (const choice of q.choices) expect(legal).toContain(choice);
      // It is your side to move, and the board faces your way.
      expect(q.fen.split(" ")[1]).toBe(q.orientation === "white" ? "w" : "b");
    }
  });

  it("picks distractors that are legal and never the right answer", () => {
    const rng = createRng(3);
    const moves = pickDistractorMoves(START_FEN, "e4", 3, rng);
    expect(moves).toHaveLength(3);
    expect(moves).not.toContain("e4");
    expect(new Set(moves).size).toBe(3);
  });
});

describe("spot the trap", () => {
  it("asks for a move by the winning side from the trap line", () => {
    const rng = createRng(4);
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const q = makeTrapQuestion(getTraps(), rng)!;
      expectWellFormed(q);
      const [, trapId, ply] = q.id.split(":");
      seen.add(trapId);
      const trap = getTraps().find((t) => t.id === trapId)!;
      expect(q.choices[q.answer]).toBe(trap.moves[Number(ply)][0]);
      expect(Number(ply)).toBeGreaterThanOrEqual(trap.keyPly);
      expect(q.orientation).toBe(trap.winner);
    }
    expect(seen.size).toBe(getTraps().length);
  });
});

describe("which side benefits", () => {
  it("answers White/Black for traps and 'About equal' for balanced lines", () => {
    const rng = createRng(5);
    const answers = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const q = makeSideQuestion(sources, rng)!;
      expectWellFormed(q);
      expect(q.choices).toEqual(["White", "Black", "About equal"]);
      answers.add(q.answer);
      const id = q.id.replace("side:", "");
      const trap = getTraps().find((t) => t.id === id);
      if (trap) {
        expect(q.answer).toBe(trap.winner === "white" ? 0 : 1);
        // The final mating move is not shown, so the answer is not given away.
        expect(new Chess(q.fen).isCheckmate()).toBe(false);
      } else {
        expect(BALANCED_LINES.has(id)).toBe(true);
        expect(q.answer).toBe(2);
      }
    }
    expect(answers).toEqual(new Set([0, 1, 2]));
  });

  it("every 'balanced' line id really exists", () => {
    const all = new Set(getCuratedOpenings().flatMap((o) => getLines(o.id).map((l) => l.id)));
    for (const id of BALANCED_LINES) expect(all.has(id), id).toBe(true);
  });
});

describe("generateQuiz", () => {
  it("builds a 20-question mixed test with no repeats", () => {
    const quiz = generateQuiz(["name", "next-move", "trap", "side"], 20, sources, createRng(6));
    expect(quiz).toHaveLength(20);
    expect(new Set(quiz.map((q) => q.id)).size).toBe(20);
    expect(new Set(quiz.map((q) => q.type)).size).toBe(4);
    quiz.forEach(expectWellFormed);
  });

  it("builds single-type quizzes", () => {
    for (const type of ["name", "next-move", "trap", "side"] as const) {
      const quiz = generateQuiz([type], 10, sources, createRng(7));
      expect(quiz).toHaveLength(10);
      expect(quiz.every((q) => q.type === type)).toBe(true);
    }
  });

  it("is reproducible with the same seed", () => {
    const a = generateQuiz(["name", "trap"], 8, sources, createRng(42));
    const b = generateQuiz(["name", "trap"], 8, sources, createRng(42));
    expect(a).toEqual(b);
  });

  it("stops instead of looping forever when it runs out of questions", () => {
    const quiz = generateQuiz(["trap"], 500, { ...sources, traps: getTraps().slice(0, 1) }, createRng(8));
    expect(quiz.length).toBeLessThan(500);
    expect(quiz.length).toBeGreaterThan(0);
  });
});
