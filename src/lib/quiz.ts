import { Chess } from "chess.js";
import { formatMoves, replaySan, shuffle, START_FEN } from "./chess-utils";
import type { ResolvedLine } from "./curated";
import type { LibraryOpening, Side, Trap } from "./types";

export type QuizType = "name" | "next-move" | "trap" | "side";

export const QUIZ_TYPES: { type: QuizType; title: string; description: string }[] = [
  { type: "name", title: "Name this opening", description: "See a position, pick the opening it belongs to." },
  { type: "next-move", title: "Next move", description: "Pick the right move from your repertoire." },
  { type: "trap", title: "Spot the trap", description: "Find the move that punishes the mistake." },
  { type: "side", title: "Which side benefits?", description: "Judge who comes out on top." },
];

export interface QuizQuestion {
  /** Unique within a quiz, used to avoid repeats. */
  id: string;
  type: QuizType;
  prompt: string;
  fen: string;
  orientation: Side;
  lastMove?: { from: string; to: string };
  /** The moves that led to the position, e.g. "1.e4 e5 2.Nf3". */
  movesText: string;
  choices: string[];
  /** Index of the correct choice. */
  answer: number;
  explanation: string;
}

export interface QuizSources {
  library: LibraryOpening[];
  /** Curated lines from trainable openings. */
  lines: ResolvedLine[];
  traps: Trap[];
}

type Rng = () => number;

/** Well-known openings a club player should be able to name. */
export const FAMOUS_OPENINGS = [
  "Italian Game",
  "Ruy Lopez",
  "Scotch Game",
  "Vienna Game",
  "King's Gambit",
  "Four Knights Game",
  "Petrov's Defense",
  "Philidor Defense",
  "Bishop's Opening",
  "Danish Gambit",
  "Sicilian Defense",
  "French Defense",
  "Caro-Kann Defense",
  "Scandinavian Defense",
  "Pirc Defense",
  "Alekhine Defense",
  "Queen's Gambit Declined",
  "Queen's Gambit Accepted",
  "Slav Defense",
  "London System",
  "King's Indian Defense",
  "Nimzo-Indian Defense",
  "Grünfeld Defense",
  "Dutch Defense",
  "Benoni Defense",
  "Englund Gambit",
  "English Opening",
];

/** The name shown as a quiz answer for a library opening. */
export function quizLabel(opening: LibraryOpening): string {
  if (opening.name.includes("London System")) return "London System";
  return opening.family;
}

function pickOne<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

function buildChoices(correct: string, distractors: string[], rng: Rng) {
  const choices = shuffle([correct, ...distractors], rng);
  return { choices, answer: choices.indexOf(correct) };
}

function lastMoveOf(sans: string[], startFen = START_FEN) {
  if (sans.length === 0) return undefined;
  const moves = replaySan(sans, startFen);
  const last = moves[moves.length - 1];
  return { from: last.from, to: last.to };
}

/* ---------------- Name this opening ---------------- */

export function nameQuestionPool(library: LibraryOpening[]): LibraryOpening[] {
  const famous = new Set(FAMOUS_OPENINGS);
  return library.filter((o) => {
    const plies = o.moves.split(" ").length;
    return famous.has(quizLabel(o)) && plies >= 2 && plies <= 8;
  });
}

export function makeNameQuestion(library: LibraryOpening[], rng: Rng): QuizQuestion | null {
  const pool = nameQuestionPool(library);
  if (pool.length === 0) return null;
  // Pick the family first so common openings are not drowned out by ones with many variations.
  const labels = [...new Set(pool.map(quizLabel))];
  if (labels.length < 4) return null;
  const label = pickOne(labels, rng);
  const opening = pickOne(pool.filter((o) => quizLabel(o) === label), rng);
  const sans = opening.moves.split(" ");
  const distractors = shuffle(labels.filter((l) => l !== label), rng).slice(0, 3);
  return {
    id: `name:${opening.id}`,
    type: "name",
    prompt: "Which opening is this?",
    fen: opening.fen,
    orientation: "white",
    lastMove: lastMoveOf(sans),
    movesText: formatMoves(sans),
    ...buildChoices(label, distractors, rng),
    explanation: `${opening.name} (${opening.eco}): ${formatMoves(sans)}`,
  };
}

/* ---------------- Next move ---------------- */

/** Picks believable wrong moves: other legal moves, preferring active-looking ones. */
export function pickDistractorMoves(fen: string, correctSan: string, count: number, rng: Rng): string[] {
  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true }).filter((m) => m.san !== correctSan);
  const score = (m: (typeof legal)[number]) => {
    let s = rng();
    if (m.piece === "n" || m.piece === "b") s += 1.2;
    if (m.captured) s += 1;
    if (m.piece === "p" && "cdef".includes(m.to[0])) s += 0.8;
    if (m.san.startsWith("O-O")) s += 1.2;
    if (m.piece === "q") s += 0.4;
    if (m.piece === "k" && !m.san.startsWith("O-O")) s -= 1;
    return s;
  };
  return legal
    .map((m) => ({ san: m.san, s: score(m) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, count)
    .map((m) => m.san);
}

export function makeNextMoveQuestion(lines: ResolvedLine[], rng: Rng): QuizQuestion | null {
  if (lines.length === 0) return null;
  for (let attempt = 0; attempt < 20; attempt++) {
    const line = pickOne(lines, rng);
    const moves = replaySan(line.sans);
    const userColor = line.side === "white" ? "w" : "b";
    const candidates = moves
      .map((m, ply) => ({ m, ply }))
      .filter(({ m, ply }) => m.color === userColor && ply >= 2);
    if (candidates.length === 0) continue;
    const { m, ply } = pickOne(candidates, rng);
    const distractors = pickDistractorMoves(m.before, m.san, 3, rng);
    if (distractors.length < 3) continue;
    const before = line.sans.slice(0, ply);
    return {
      id: `next:${line.openingId}:${m.before.split(" ").slice(0, 2).join("")}`,
      type: "next-move",
      prompt: `${line.openingName}: what do you play as ${line.side === "white" ? "White" : "Black"}?`,
      fen: m.before,
      orientation: line.side,
      lastMove: lastMoveOf(before),
      movesText: formatMoves(before),
      ...buildChoices(m.san, distractors, rng),
      explanation: `${m.san} — ${line.notes[ply] || "the repertoire move."}`,
    };
  }
  return null;
}

/* ---------------- Spot the trap ---------------- */

export function makeTrapQuestion(traps: Trap[], rng: Rng): QuizQuestion | null {
  if (traps.length === 0) return null;
  for (let attempt = 0; attempt < 20; attempt++) {
    const trap = pickOne(traps, rng);
    const sans = trap.moves.map(([san]) => san);
    const moves = replaySan(sans);
    const winnerColor = trap.winner === "white" ? "w" : "b";
    // The first punishing move is the most likely question; follow-ups appear too.
    const plies = moves
      .map((m, ply) => ({ m, ply }))
      .filter(({ m, ply }) => m.color === winnerColor && ply >= trap.keyPly);
    if (plies.length === 0) continue;
    const { m, ply } = rng() < 0.6 ? plies[0] : pickOne(plies, rng);
    const distractors = pickDistractorMoves(m.before, m.san, 3, rng);
    if (distractors.length < 3) continue;
    const before = sans.slice(0, ply);
    return {
      id: `trap:${trap.id}:${ply}`,
      type: "trap",
      prompt: `${trap.winner === "white" ? "White" : "Black"} to move. Find the move that springs the trap.`,
      fen: m.before,
      orientation: trap.winner,
      lastMove: lastMoveOf(before),
      movesText: formatMoves(before),
      ...buildChoices(m.san, distractors, rng),
      explanation: `${trap.name}: ${m.san} — ${trap.moves[ply][1]}`,
    };
  }
  return null;
}

/* ---------------- Which side benefits? ---------------- */

const SIDE_CHOICES = ["White", "Black", "About equal"];

/**
 * Curated lines whose final position is balanced. (Checked with an engine when
 * the content was written.) Used for the "About equal" answers.
 */
export const BALANCED_LINES = new Set<string>([
  "italian-game/main",
  "queens-gambit/main",
  "london-system/bf5-copy",
  "e5-open-game/main",
  "e5-open-game/c3-d4",
  "e5-open-game/ruy-lopez",
  "e5-open-game/scotch",
  "two-knights-defence/d3-quiet",
  "caro-kann/main",
  "queens-gambit-declined/main",
  "slav-defence/exchange",
  "slav-defence/quiet-e3",
]);

export function makeSideQuestion(sources: Pick<QuizSources, "traps" | "lines">, rng: Rng): QuizQuestion | null {
  const balanced = sources.lines.filter((l) => BALANCED_LINES.has(l.id));
  const useBalanced = balanced.length > 0 && (sources.traps.length === 0 || rng() < 0.35);

  if (useBalanced) {
    const line = pickOne(balanced, rng);
    const moves = replaySan(line.sans);
    const last = moves[moves.length - 1];
    return {
      id: `side:${line.id}`,
      type: "side",
      prompt: "Who is better in this position?",
      fen: last.after,
      orientation: "white",
      lastMove: { from: last.from, to: last.to },
      movesText: formatMoves(line.sans),
      choices: SIDE_CHOICES,
      answer: 2,
      explanation: `${line.openingName} — ${line.name}. Both sides have played good moves and the position is balanced.`,
    };
  }

  if (sources.traps.length === 0) return null;
  const trap = pickOne(sources.traps, rng);
  const sans = trap.moves.map(([san]) => san);
  // For mating lines, stop one move before the mate so the answer is not given away.
  const shown = trap.mate ? sans.slice(0, sans.length - 1) : sans;
  const moves = replaySan(shown);
  const last = moves[moves.length - 1];
  return {
    id: `side:${trap.id}`,
    type: "side",
    prompt: "Who is better in this position?",
    fen: last.after,
    orientation: "white",
    lastMove: { from: last.from, to: last.to },
    movesText: formatMoves(shown),
    choices: SIDE_CHOICES,
    answer: trap.winner === "white" ? 0 : 1,
    explanation: `${trap.name}: ${trap.winner === "white" ? "White" : "Black"} is winning. ${trap.summary}`,
  };
}

/* ---------------- Quiz builder ---------------- */

export function makeQuestion(type: QuizType, sources: QuizSources, rng: Rng): QuizQuestion | null {
  switch (type) {
    case "name":
      return makeNameQuestion(sources.library, rng);
    case "next-move":
      return makeNextMoveQuestion(sources.lines, rng);
    case "trap":
      return makeTrapQuestion(sources.traps, rng);
    case "side":
      return makeSideQuestion(sources, rng);
  }
}

/**
 * Builds a quiz with no repeated questions.
 * `types` with several entries produces a mixed quiz (used by the timed test).
 */
export function generateQuiz(
  types: QuizType[],
  count: number,
  sources: QuizSources,
  rng: Rng = Math.random,
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const seen = new Set<string>();
  // Give up after many misses in a row: the pool of questions is used up.
  let misses = 0;
  while (questions.length < count && misses < 60) {
    const type = types[(questions.length + Math.floor(rng() * types.length)) % types.length];
    const question = makeQuestion(type, sources, rng);
    if (!question || seen.has(question.id)) {
      misses++;
      continue;
    }
    misses = 0;
    seen.add(question.id);
    questions.push(question);
  }
  return questions;
}

export const TEST_QUESTION_COUNT = 20;
export const TEST_SECONDS_PER_QUESTION = 20;
export const PRACTICE_QUESTION_COUNT = 10;
