/**
 * Replays EVERY curated line with chess.js and checks the generated data.
 *
 *  - any illegal move fails the run
 *  - every line labelled as mate must end in checkmate
 *  - your own moves must be consistent inside one trainable opening
 *  - every move must have an explanation
 *
 * Usage: npm run validate
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";
import { curatedOpenings, traps, patterns, starterRepertoire } from "../data/curated";
import { resolveLines } from "../src/lib/curated";
import { fenKey, START_FEN } from "../src/lib/chess-utils";
import type { LibraryOpening, Puzzle } from "../src/lib/types";

const errors: string[] = [];
let linesChecked = 0;
let movesChecked = 0;

function fail(where: string, message: string) {
  errors.push(`✗ ${where}: ${message}`);
}

const SQUARE = /^[a-h][1-8]$/;

interface Played {
  san: string;
  color: "w" | "b";
  before: string;
  after: string;
}

/** Replays a line. Reports illegal moves and non-standard SAN spelling. */
function replay(where: string, sans: string[], startFen = START_FEN): { chess: Chess; played: Played[] } | null {
  let chess: Chess;
  try {
    chess = new Chess(startFen);
  } catch (err) {
    fail(where, `invalid FEN "${startFen}" (${String(err)})`);
    return null;
  }
  const played: Played[] = [];
  linesChecked++;
  for (let i = 0; i < sans.length; i++) {
    const san = sans[i];
    try {
      const move = chess.move(san, { strict: true });
      if (move.san !== san) {
        fail(where, `move ${i + 1} is written "${san}" but should be "${move.san}"`);
      }
      played.push({ san: move.san, color: move.color, before: move.before, after: move.after });
      movesChecked++;
    } catch {
      fail(where, `illegal move "${san}" at ply ${i + 1} (after: ${sans.slice(0, i).join(" ") || "start"})`);
      return null;
    }
  }
  return { chess, played };
}

function checkArrows(where: string, arrows: string[] | undefined) {
  for (const arrow of arrows ?? []) {
    if (!SQUARE.test(arrow.slice(0, 2)) || !SQUARE.test(arrow.slice(2, 4)) || arrow.length !== 4) {
      fail(where, `bad arrow "${arrow}"`);
    }
  }
}

/* ---------------- Curated openings ---------------- */

const trapIds = new Set(traps.map((t) => t.id));
const openingIds = new Set<string>();

for (const opening of curatedOpenings) {
  const where = `opening ${opening.id}`;
  if (openingIds.has(opening.id)) fail(where, "duplicate id");
  openingIds.add(opening.id);

  if (!opening.summary || opening.ideas.length === 0 || opening.plans.length === 0) {
    fail(where, "summary, ideas and plans are required");
  }
  if (opening.mistakes.length === 0) fail(where, "needs at least one common mistake");
  if (opening.sidelines.length < 2) fail(where, "needs at least 2 sidelines");
  if (opening.mainLine.moves.length < 16) {
    fail(where, `main line is only ${opening.mainLine.moves.length} plies (need 8 full moves)`);
  }
  for (const [, why] of opening.mainLine.moves) {
    if (!why) fail(where, "every main-line move needs an explanation");
  }
  for (const note of opening.traps) {
    if (note.trapId && !trapIds.has(note.trapId)) fail(where, `unknown trapId "${note.trapId}"`);
  }

  const lineIds = new Set<string>();
  // position -> the move you play there (must be the same in every line)
  const repertoireMoves = new Map<string, { san: string; line: string }>();
  const userColor = opening.side === "white" ? "w" : "b";

  for (const line of resolveLines(opening)) {
    const lineWhere = `${where} / ${line.id}`;
    if (lineIds.has(line.id)) fail(lineWhere, "duplicate line id");
    lineIds.add(line.id);

    const result = replay(lineWhere, line.sans);
    if (!result) continue;

    line.notes.forEach((note, i) => {
      if (!note) fail(lineWhere, `move ${i + 1} (${line.sans[i]}) has no explanation`);
    });
    line.arrows.forEach((arrows) => checkArrows(lineWhere, arrows));

    if (opening.trainable) {
      for (const move of result.played) {
        if (move.color !== userColor) continue;
        const key = fenKey(move.before);
        const known = repertoireMoves.get(key);
        if (known && known.san !== move.san) {
          fail(lineWhere, `plays ${move.san} where line "${known.line}" plays ${known.san} in the same position`);
        }
        if (!known) repertoireMoves.set(key, { san: move.san, line: line.id });
      }
    }
  }
}

for (const side of ["white", "black"] as const) {
  for (const id of starterRepertoire[side]) {
    const opening = curatedOpenings.find((o) => o.id === id);
    if (!opening) fail("starter repertoire", `unknown opening "${id}"`);
    else if (opening.side !== side) fail("starter repertoire", `"${id}" is not a ${side} opening`);
  }
}

/* ---------------- Traps and quick checkmates ---------------- */

for (const trap of traps) {
  const where = `trap ${trap.id}`;
  const sans = trap.moves.map(([san]) => san);
  trap.moves.forEach(([san, why, arrows]) => {
    if (!why) fail(where, `move ${san} has no explanation`);
    checkArrows(where, arrows);
  });
  const result = replay(where, sans);
  if (!result) continue;

  const isMate = result.chess.isCheckmate();
  if (trap.mate && !isMate) fail(where, "is labelled as mate but does not end in checkmate");
  if (!trap.mate && isMate) fail(where, "ends in checkmate but is not labelled as mate");

  const winnerColor = trap.winner === "white" ? "w" : "b";
  if (trap.mate && result.played[result.played.length - 1].color !== winnerColor) {
    fail(where, "the winner does not deliver the final move");
  }
  const key = result.played[trap.keyPly];
  const blunder = result.played[trap.blunderPly];
  if (!key || key.color !== winnerColor) fail(where, "keyPly must be a move by the winner");
  if (!blunder || blunder.color === winnerColor) fail(where, "blunderPly must be a move by the loser");

  if (!trap.defend.text) fail(where, "needs a 'how to defend' section");
  const at = result.played[trap.defend.atPly];
  if (!at || at.color === winnerColor) {
    fail(where, "defend.atPly must be a move by the defending side");
  } else {
    const alt = new Chess(at.before);
    try {
      const move = alt.move(trap.defend.better, { strict: true });
      if (move.san !== trap.defend.better) fail(where, `defend.better should be written "${move.san}"`);
      if (move.san === at.san) fail(where, "defend.better is the same as the losing move");
    } catch {
      fail(where, `defend.better "${trap.defend.better}" is not legal at ply ${trap.defend.atPly + 1}`);
    }
  }
}

/* ---------------- Mating patterns ---------------- */

for (const pattern of patterns) {
  const where = `pattern ${pattern.id}`;
  if (pattern.recognise.length === 0) fail(where, "needs 'what to look for' points");
  const lesson = replay(`${where} / lesson`, pattern.lesson.moves.map(([san]) => san), pattern.lesson.fen);
  if (lesson && !lesson.chess.isCheckmate()) fail(`${where} / lesson`, "does not end in checkmate");
  pattern.lesson.moves.forEach(([san, why]) => {
    if (!why) fail(where, `lesson move ${san} has no explanation`);
  });
  if (pattern.exercises.length === 0) fail(where, "needs at least one exercise");
  pattern.exercises.forEach((exercise, i) => {
    const exWhere = `${where} / exercise ${i + 1}`;
    if (exercise.moves.length % 2 === 0) fail(exWhere, "solution must start and end with your move");
    const result = replay(exWhere, exercise.moves, exercise.fen);
    if (result && !result.chess.isCheckmate()) fail(exWhere, "does not end in checkmate");
  });
}

/* ---------------- Generated data ---------------- */

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), "../data");

const openingsPath = resolve(dataDir, "openings.json");
let libraryCount = 0;
if (!existsSync(openingsPath)) {
  fail("data/openings.json", "missing — run npm run data:openings");
} else {
  const library = JSON.parse(readFileSync(openingsPath, "utf8")) as LibraryOpening[];
  libraryCount = library.length;
  const ids = new Set<string>();
  for (const opening of library) {
    if (ids.has(opening.id)) fail(`library ${opening.id}`, "duplicate id");
    ids.add(opening.id);
    const result = replay(`library ${opening.id}`, opening.moves.split(" "));
    if (result && result.chess.fen() !== opening.fen) fail(`library ${opening.id}`, "stored FEN does not match the moves");
  }
}

const puzzlesPath = resolve(dataDir, "puzzles.json");
let puzzleCount = 0;
if (!existsSync(puzzlesPath)) {
  fail("data/puzzles.json", "missing — run npm run data:puzzles");
} else {
  const puzzles = JSON.parse(readFileSync(puzzlesPath, "utf8")) as Puzzle[];
  puzzleCount = puzzles.length;
  for (const puzzle of puzzles) {
    const where = `puzzle ${puzzle.id}`;
    try {
      const chess = new Chess(puzzle.fen);
      for (const uci of puzzle.moves) {
        chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      }
      if (!chess.isCheckmate()) fail(where, "does not end in checkmate");
      if (puzzle.moves.length !== puzzle.mateIn * 2) fail(where, `mateIn ${puzzle.mateIn} but ${puzzle.moves.length} moves`);
    } catch {
      fail(where, "contains an illegal move");
    }
  }
}

/* ---------------- Report ---------------- */

if (errors.length > 0) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} problem(s) found.`);
  process.exit(1);
}

console.log(
  [
    `✓ ${curatedOpenings.length} curated openings`,
    `✓ ${traps.length} traps (${traps.filter((t) => t.mate).length} end in checkmate)`,
    `✓ ${patterns.length} mating patterns`,
    `✓ ${libraryCount} library openings`,
    `✓ ${puzzleCount} puzzles`,
    `✓ ${linesChecked} lines, ${movesChecked} moves replayed — all legal`,
  ].join("\n"),
);
