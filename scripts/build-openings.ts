/**
 * Downloads the Lichess openings list (CC0) and converts it to data/openings.json.
 * Source: https://github.com/lichess-org/chess-openings (files a.tsv … e.tsv)
 *
 * Usage: npm run data:openings
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";

const BASE =
  "https://raw.githubusercontent.com/lichess-org/chess-openings/master";
const FILES = ["a", "b", "c", "d", "e"];
const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../data/openings.json",
);

export interface OpeningRecord {
  id: string;
  eco: string;
  name: string;
  family: string;
  variation: string;
  /** SAN moves separated by spaces, e.g. "e4 e5 Nf3" */
  moves: string;
  fen: string;
  side: "white" | "black";
}

/** Openings named after Black's choice of setup. */
const BLACK_FAMILY =
  /Defen[cs]e|Counter|Sicilian|French|Caro-Kann|Pirc|Scandinavian|Alekhine|Benoni|Dutch|Slav|Benko|Budapest|Englund|Modern|Indian(?! Attack)|Declined|Accepted|Gr[uü]nfeld|Nimzo|Bogo|Petrov|Philidor|Tarrasch|Semi-Slav|Hippopotamus|Owen|St\. George|Borg|Latvian|Elephant|Rat |Lion|Czech|Old Indian|Polish Defense|Robatsch|Kangaroo|Mexican|Horwitz|Queen's Pawn Game: (Chigorin|Symmetrical)/;

function sideFor(family: string): "white" | "black" {
  return BLACK_FAMILY.test(family) ? "black" : "white";
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** "1. e4 e5 2. Nf3" -> ["e4", "e5", "Nf3"] */
function pgnToSan(pgn: string): string[] {
  return pgn
    .split(/\s+/)
    .filter((token) => token && !/^\d+\.+$/.test(token))
    .map((token) => token.replace(/^\d+\.+/, ""))
    .filter(Boolean);
}

async function main() {
  const records: OpeningRecord[] = [];
  const usedIds = new Set<string>();
  let invalid = 0;

  for (const file of FILES) {
    const url = `${BASE}/${file}.tsv`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const header = lines.shift();
    if (!header?.startsWith("eco\tname\tpgn")) {
      throw new Error(`Unexpected header in ${file}.tsv: ${header}`);
    }

    for (const line of lines) {
      const [eco, name, pgn] = line.split("\t");
      if (!eco || !name || !pgn) {
        throw new Error(`Malformed row in ${file}.tsv: ${line}`);
      }
      const chess = new Chess();
      const sans: string[] = [];
      try {
        for (const san of pgnToSan(pgn)) {
          // Re-serialise through chess.js so every SAN is in canonical form.
          sans.push(chess.move(san).san);
        }
      } catch (err) {
        invalid++;
        console.error(`✗ Illegal move in ${eco} ${name}: ${pgn} (${String(err)})`);
        continue;
      }

      const colon = name.indexOf(":");
      const family = (colon === -1 ? name : name.slice(0, colon)).trim();
      const variation = colon === -1 ? "" : name.slice(colon + 1).trim();

      let id = `${eco.toLowerCase()}-${slugify(name)}`;
      if (usedIds.has(id)) {
        let n = 2;
        while (usedIds.has(`${id}-${n}`)) n++;
        id = `${id}-${n}`;
      }
      usedIds.add(id);

      records.push({
        id,
        eco,
        name,
        family,
        variation,
        moves: sans.join(" "),
        fen: chess.fen(),
        side: sideFor(family),
      });
    }
  }

  if (invalid > 0) {
    throw new Error(`${invalid} opening line(s) failed validation`);
  }

  records.sort(
    (a, b) => a.eco.localeCompare(b.eco) || a.name.localeCompare(b.name),
  );
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(records));
  console.log(`✓ Wrote ${records.length} validated openings to data/openings.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
