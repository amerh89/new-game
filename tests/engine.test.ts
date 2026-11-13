import { describe, expect, it } from "vitest";
import {
  buildCards,
  buildDeck,
  createSession,
  currentCard,
  isCorrectMove,
  runAdvanceOpponent,
  runExpected,
  runFen,
  runResults,
  runStatus,
  runSubmit,
  sessionAnswer,
  sessionDone,
  sessionSummary,
  startRun,
  type TrainLine,
} from "@/lib/training/engine";
import { getCuratedOpenings, getTrainingLines } from "@/lib/curated";
import { START_FEN } from "@/lib/chess-utils";

const italian: TrainLine = {
  id: "test/italian",
  openingId: "test",
  openingName: "Test opening",
  name: "Italian",
  side: "white",
  sans: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"],
  notes: ["centre", "", "attack e5", "", "aim at f7", ""],
};

const asBlack: TrainLine = { ...italian, id: "test/black", side: "black" };

describe("buildCards", () => {
  it("makes one card for each of your moves when you are White", () => {
    const cards = buildCards(italian);
    expect(cards.map((c) => c.san)).toEqual(["e4", "Nf3", "Bc4"]);
    expect(cards[0].fen).toBe(START_FEN);
    expect(cards[0].lead).toBeUndefined();
    expect(cards[1]).toMatchObject({ from: "g1", to: "f3", ply: 2, note: "attack e5" });
    expect(cards[1].lead).toMatchObject({ san: "e5", from: "e7", to: "e5" });
  });

  it("makes cards for Black's moves when you are Black", () => {
    const cards = buildCards(asBlack);
    expect(cards.map((c) => c.san)).toEqual(["e5", "Nc6", "Bc5"]);
    expect(cards.every((c) => c.fen.split(" ")[1] === "b")).toBe(true);
    expect(cards[0].lead?.san).toBe("e4");
  });

  it("throws on an illegal line", () => {
    expect(() => buildCards({ ...italian, sans: ["e4", "e5", "Ke3"] })).toThrow(/Illegal move/);
  });
});

describe("buildDeck", () => {
  it("counts a position shared by two lines only once", () => {
    const other: TrainLine = { ...italian, id: "test/two-knights", sans: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5"] };
    const deck = buildDeck([italian, other]);
    // e4, Nf3, Bc4 are shared; Ng5 is new.
    expect(deck.map((c) => c.san)).toEqual(["e4", "Nf3", "Bc4", "Ng5"]);
    expect(new Set(deck.map((c) => c.key)).size).toBe(deck.length);
  });

  it("keeps cards from different openings separate even in the same position", () => {
    const vienna: TrainLine = { ...italian, id: "v/main", openingId: "vienna", sans: ["e4", "e5", "Nc3"] };
    const deck = buildDeck([italian, vienna]);
    expect(deck.filter((c) => c.fen === START_FEN)).toHaveLength(2);
  });
});

describe("isCorrectMove", () => {
  it("compares squares", () => {
    expect(isCorrectMove({ from: "e2", to: "e4" }, { from: "e2", to: "e4" })).toBe(true);
    expect(isCorrectMove({ from: "e2", to: "e4" }, { from: "d2", to: "d4" })).toBe(false);
  });

  it("checks the promotion piece (under-promotion matters)", () => {
    const expected = { from: "f2", to: "g1", promotion: "n" };
    expect(isCorrectMove(expected, { from: "f2", to: "g1", promotion: "n" })).toBe(true);
    expect(isCorrectMove(expected, { from: "f2", to: "g1", promotion: "q" })).toBe(false);
    expect(isCorrectMove(expected, { from: "f2", to: "g1" })).toBe(false);
  });
});

describe("line run (Learn mode)", () => {
  it("waits for you when you are White and plays the opponent's replies", () => {
    let run = startRun(italian);
    expect(runStatus(run)).toBe("user");
    expect(runExpected(run)?.san).toBe("e4");

    let result = runSubmit(run, { from: "e2", to: "e4" });
    expect(result.correct).toBe(true);
    run = result.run;
    expect(runStatus(run)).toBe("opponent");

    // Submitting during the opponent's turn does nothing.
    expect(runSubmit(run, { from: "g1", to: "f3" }).run).toBe(run);

    run = runAdvanceOpponent(run);
    expect(runStatus(run)).toBe("user");
    expect(runFen(run)).toContain(" w ");

    result = runSubmit(run, { from: "g1", to: "f3" });
    run = runAdvanceOpponent(result.run);
    result = runSubmit(run, { from: "f1", to: "c4" });
    run = runAdvanceOpponent(result.run);
    expect(runStatus(run)).toBe("done");
    expect(run.mistakes).toEqual([]);
  });

  it("starts with the opponent's move when you are Black", () => {
    let run = startRun(asBlack);
    expect(runStatus(run)).toBe("opponent");
    run = runAdvanceOpponent(run);
    expect(runStatus(run)).toBe("user");
    expect(runExpected(run)?.san).toBe("e5");
  });

  it("keeps the position after a wrong move and grades that card 'again'", () => {
    let run = startRun(italian);
    const fenBefore = runFen(run);

    const wrong = runSubmit(run, { from: "d2", to: "d4" });
    expect(wrong.correct).toBe(false);
    expect(runFen(wrong.run)).toBe(fenBefore);
    expect(wrong.run.mistakes).toEqual([0]);

    // A second slip on the same move is only counted once.
    const wrongAgain = runSubmit(wrong.run, { from: "c2", to: "c4" });
    expect(wrongAgain.run.mistakes).toEqual([0]);

    run = runSubmit(wrongAgain.run, { from: "e2", to: "e4" }).run;
    run = runAdvanceOpponent(run);
    run = runSubmit(run, { from: "g1", to: "f3" }).run;
    run = runAdvanceOpponent(run);
    run = runSubmit(run, { from: "f1", to: "c4" }).run;
    run = runAdvanceOpponent(run);

    const results = runResults(run);
    expect(results.map((r) => [r.card.san, r.grade])).toEqual([
      ["e4", "again"],
      ["Nf3", "good"],
      ["Bc4", "good"],
    ]);
  });

  it("only reports cards you actually reached", () => {
    let run = startRun(italian);
    run = runSubmit(run, { from: "e2", to: "e4" }).run;
    expect(runResults(run).map((r) => r.card.san)).toEqual(["e4"]);
  });
});

describe("card session (Review and Drill)", () => {
  const cards = buildCards(italian);

  it("moves on after a correct answer and records 'good'", () => {
    let session = createSession(cards);
    expect(currentCard(session)?.san).toBe("e4");
    const result = sessionAnswer(session, { from: "e2", to: "e4" });
    expect(result).toMatchObject({ correct: true, firstAttempt: true });
    session = result.session;
    expect(currentCard(session)?.san).toBe("Nf3");
    expect(session.results[cards[0].key]).toBe("good");
  });

  it("stays on the card after a wrong answer, grades it 'again' and re-queues it once", () => {
    let session = createSession(cards);
    let result = sessionAnswer(session, { from: "a2", to: "a3" });
    expect(result.correct).toBe(false);
    session = result.session;
    expect(currentCard(session)?.san).toBe("e4");
    expect(session.results[cards[0].key]).toBe("again");
    expect(session.queue).toHaveLength(cards.length + 1);

    // Another wrong try does not queue it a second time.
    session = sessionAnswer(session, { from: "h2", to: "h3" }).session;
    expect(session.queue).toHaveLength(cards.length + 1);

    // Retrying correctly moves on but the grade stays "again".
    result = sessionAnswer(session, { from: "e2", to: "e4" });
    expect(result).toMatchObject({ correct: true, firstAttempt: false });
    session = result.session;
    expect(session.results[cards[0].key]).toBe("again");

    session = sessionAnswer(session, { from: "g1", to: "f3" }).session;
    session = sessionAnswer(session, { from: "f1", to: "c4" }).session;
    expect(sessionDone(session)).toBe(false);
    // The missed card comes back at the end.
    expect(currentCard(session)?.san).toBe("e4");
    session = sessionAnswer(session, { from: "e2", to: "e4" }).session;
    expect(sessionDone(session)).toBe(true);

    expect(sessionSummary(session)).toEqual({ total: 3, good: 2, again: 1, accuracy: 67 });
  });

  it("handles an empty session", () => {
    const session = createSession([]);
    expect(sessionDone(session)).toBe(true);
    expect(sessionSummary(session).accuracy).toBe(0);
  });
});

describe("curated repertoire", () => {
  it("every trainable curated opening produces a deck with consistent answers", () => {
    for (const opening of getCuratedOpenings()) {
      const lines = getTrainingLines(opening.id);
      expect(lines.length).toBeGreaterThan(0);
      const deck = buildDeck(lines);
      expect(deck.length).toBeGreaterThanOrEqual(8);
      // Same position inside one opening must always have the same answer.
      const answers = new Map<string, string>();
      for (const line of lines) {
        for (const card of buildCards(line)) {
          const known = answers.get(card.key);
          if (known) expect(card.san).toBe(known);
          answers.set(card.key, card.san);
        }
      }
    }
  });
});
