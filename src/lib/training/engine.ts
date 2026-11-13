import { fenKey, replaySan, START_FEN, type MoveInput } from "../chess-utils";
import type { Side } from "../types";

/** The minimum a line needs in order to be trained. */
export interface TrainLine {
  id: string;
  openingId: string;
  openingName: string;
  name: string;
  side: Side;
  sans: string[];
  notes: string[];
  startFen?: string;
}

/** One position where you must find the move. Each card is scheduled by FSRS. */
export interface TrainCard {
  /** `${openingId}|${position}` — shared by lines that pass through the same position. */
  key: string;
  openingId: string;
  openingName: string;
  lineId: string;
  lineName: string;
  side: Side;
  /** Index of your move within the line. */
  ply: number;
  /** Position in which you must move. */
  fen: string;
  san: string;
  from: string;
  to: string;
  promotion?: string;
  note: string;
  /** The opponent move that led here (animated before you answer). */
  lead?: { fen: string; san: string; from: string; to: string };
}

function isUserPly(line: TrainLine, ply: number, firstMover: "w" | "b"): boolean {
  const moverIsWhite = (firstMover === "w") === (ply % 2 === 0);
  return (line.side === "white") === moverIsWhite;
}

/** Every position in the line where it is your turn becomes a card. */
export function buildCards(line: TrainLine): TrainCard[] {
  const moves = replaySan(line.sans, line.startFen ?? START_FEN);
  const cards: TrainCard[] = [];
  moves.forEach((move, ply) => {
    const userColor = line.side === "white" ? "w" : "b";
    if (move.color !== userColor) return;
    const prev = ply > 0 ? moves[ply - 1] : undefined;
    cards.push({
      key: `${line.openingId}|${fenKey(move.before)}`,
      openingId: line.openingId,
      openingName: line.openingName,
      lineId: line.id,
      lineName: line.name,
      side: line.side,
      ply,
      fen: move.before,
      san: move.san,
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      note: line.notes[ply] ?? "",
      lead: prev
        ? { fen: prev.before, san: prev.san, from: prev.from, to: prev.to }
        : undefined,
    });
  });
  return cards;
}

/** Cards for several lines, with shared positions counted once. */
export function buildDeck(lines: TrainLine[]): TrainCard[] {
  const seen = new Set<string>();
  const deck: TrainCard[] = [];
  for (const line of lines) {
    for (const card of buildCards(line)) {
      if (seen.has(card.key)) continue;
      seen.add(card.key);
      deck.push(card);
    }
  }
  return deck;
}

export function isCorrectMove(
  expected: { from: string; to: string; promotion?: string },
  attempt: MoveInput,
): boolean {
  if (expected.from !== attempt.from || expected.to !== attempt.to) return false;
  if (expected.promotion) return (attempt.promotion ?? "q") === expected.promotion;
  return true;
}

/* ------------------------------------------------------------------ */
/* Line run: play through a whole line, opponent moves are automatic.  */
/* ------------------------------------------------------------------ */

export interface LineRun {
  line: TrainLine;
  moves: ReturnType<typeof replaySan>;
  /** Number of moves already played on the board. */
  ply: number;
  /** Plies where you made at least one mistake. */
  mistakes: number[];
  /** Plies you answered (right or wrong) — in order. */
  answered: number[];
}

export type RunStatus = "user" | "opponent" | "done";

export function startRun(line: TrainLine): LineRun {
  return {
    line,
    moves: replaySan(line.sans, line.startFen ?? START_FEN),
    ply: 0,
    mistakes: [],
    answered: [],
  };
}

export function runStatus(run: LineRun): RunStatus {
  if (run.ply >= run.moves.length) return "done";
  const userColor = run.line.side === "white" ? "w" : "b";
  return run.moves[run.ply].color === userColor ? "user" : "opponent";
}

export function runFen(run: LineRun): string {
  if (run.moves.length === 0) return run.line.startFen ?? START_FEN;
  return run.ply >= run.moves.length
    ? run.moves[run.moves.length - 1].after
    : run.moves[run.ply].before;
}

/** The move expected next (yours or the opponent's), or undefined at the end. */
export function runExpected(run: LineRun) {
  return run.moves[run.ply];
}

/** Plays the opponent's move. Does nothing unless it is the opponent's turn. */
export function runAdvanceOpponent(run: LineRun): LineRun {
  if (runStatus(run) !== "opponent") return run;
  return { ...run, ply: run.ply + 1 };
}

/**
 * Submits your move. A wrong move leaves the position unchanged and records a
 * mistake for that ply (only once), so the card is later marked "again".
 */
export function runSubmit(
  run: LineRun,
  attempt: MoveInput,
): { run: LineRun; correct: boolean } {
  if (runStatus(run) !== "user") return { run, correct: false };
  const expected = run.moves[run.ply];
  if (isCorrectMove(expected, attempt)) {
    return {
      run: {
        ...run,
        ply: run.ply + 1,
        answered: run.answered.includes(run.ply) ? run.answered : [...run.answered, run.ply],
      },
      correct: true,
    };
  }
  return {
    run: {
      ...run,
      mistakes: run.mistakes.includes(run.ply) ? run.mistakes : [...run.mistakes, run.ply],
    },
    correct: false,
  };
}

/** After a finished run: one result per card, "again" if you slipped on it. */
export function runResults(run: LineRun): { card: TrainCard; grade: "good" | "again" }[] {
  return buildCards(run.line)
    .filter((card) => run.answered.includes(card.ply))
    .map((card) => ({
      card,
      grade: run.mistakes.includes(card.ply) ? ("again" as const) : ("good" as const),
    }));
}

/* ------------------------------------------------------------------ */
/* Card session: review due cards or drill random positions.           */
/* ------------------------------------------------------------------ */

export interface CardSession {
  queue: TrainCard[];
  index: number;
  /** First-attempt result per card key. This is what gets sent to FSRS. */
  results: Record<string, "good" | "again">;
  /** Cards that were missed are shown once more at the end. */
  retried: string[];
  /** Has the current card already been answered wrongly? */
  currentMissed: boolean;
}

export function createSession(cards: TrainCard[]): CardSession {
  return { queue: [...cards], index: 0, results: {}, retried: [], currentMissed: false };
}

export function currentCard(session: CardSession): TrainCard | undefined {
  return session.queue[session.index];
}

export function sessionDone(session: CardSession): boolean {
  return session.index >= session.queue.length;
}

/**
 * Submits an answer for the current card.
 * - Correct: move on to the next card.
 * - Wrong: stay on the card (the UI shows the answer and you retry); the card
 *   is graded "again" and queued once more at the end of the session.
 */
export function sessionAnswer(
  session: CardSession,
  attempt: MoveInput,
): { session: CardSession; correct: boolean; firstAttempt: boolean } {
  const card = currentCard(session);
  if (!card) return { session, correct: false, firstAttempt: false };
  const correct = isCorrectMove(card, attempt);
  const firstAttempt = !session.currentMissed;
  const hasResult = card.key in session.results;

  if (!correct) {
    const results = hasResult ? session.results : { ...session.results, [card.key]: "again" as const };
    const alreadyRetried = session.retried.includes(card.key);
    return {
      session: {
        ...session,
        results,
        currentMissed: true,
        queue: alreadyRetried || session.currentMissed ? session.queue : [...session.queue, card],
        retried: alreadyRetried || session.currentMissed ? session.retried : [...session.retried, card.key],
      },
      correct: false,
      firstAttempt,
    };
  }

  return {
    session: {
      ...session,
      results: hasResult ? session.results : { ...session.results, [card.key]: "good" as const },
      index: session.index + 1,
      currentMissed: false,
    },
    correct: true,
    firstAttempt,
  };
}

export function sessionSummary(session: CardSession) {
  const grades = Object.values(session.results);
  const good = grades.filter((g) => g === "good").length;
  return {
    total: grades.length,
    good,
    again: grades.length - good,
    accuracy: grades.length === 0 ? 0 : Math.round((good / grades.length) * 100),
  };
}
