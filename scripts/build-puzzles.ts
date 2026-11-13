/**
 * Streams the Lichess puzzle database (CC0) and keeps a small, balanced set of
 * checkmate puzzles in data/puzzles.json.
 * Source: https://database.lichess.org/lichess_db_puzzle.csv.zst (~300 MB)
 *
 * The file is decompressed and parsed as a stream — it is never held in memory.
 *
 * Usage:
 *   npm run data:puzzles                     (downloads the database)
 *   npm run data:puzzles -- --file path.zst  (uses a file you already downloaded)
 *
 * Requires Node 22.15+ (built-in Zstandard support).
 */
import { createReadStream, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { Readable, Transform, type TransformCallback } from "node:stream";
import { createZstdDecompress } from "node:zlib";
import { Chess } from "chess.js";

const URL = "https://database.lichess.org/lichess_db_puzzle.csv.zst";
const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../data/puzzles.json",
);

const THEMES = ["mateIn1", "mateIn2", "mateIn3"] as const;
type MateTheme = (typeof THEMES)[number];

const PER_THEME = 500; // 3 × 500 = 1,500 puzzles
const WITH_OPENING_PER_THEME = 250; // so the "filter by opening" control is useful
const MIN_RATING = 600;
const MAX_RATING = 1500;
const MIN_POPULARITY = 80; // strictly greater than

export interface PuzzleRecord {
  id: string;
  /** Position BEFORE the opponent's first move. */
  fen: string;
  /** UCI moves. moves[0] is the opponent's move and is auto-played. */
  moves: string[];
  rating: number;
  mateIn: 1 | 2 | 3;
  /** Lichess OpeningTags, e.g. ["Italian_Game", "Italian_Game_Classical_Variation"] */
  openingTags: string[];
}

/** Small deterministic PRNG so the output is reproducible for the same input file. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Reservoir sampling: a fair random sample of a stream of unknown length. */
class Reservoir<T> {
  items: T[] = [];
  seen = 0;
  constructor(
    private size: number,
    private random: () => number,
  ) {}
  offer(item: T) {
    this.seen++;
    if (this.items.length < this.size) {
      this.items.push(item);
    } else {
      const j = Math.floor(this.random() * this.seen);
      if (j < this.size) this.items[j] = item;
    }
  }
}

/**
 * The Lichess file is written by a parallel compressor: every compressed frame
 * is preceded by a tiny "skippable frame" holding the size of the next frame.
 * Node's built-in decompressor does not accept skippable frames, so this
 * transform removes them and passes the real frames through untouched.
 */
class StripSkippableFrames extends Transform {
  private buffer: Buffer = Buffer.alloc(0);
  private passThrough = 0;

  _transform(chunk: Buffer, _encoding: BufferEncoding, done: TransformCallback) {
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;
    for (;;) {
      if (this.passThrough > 0) {
        const n = Math.min(this.passThrough, this.buffer.length);
        if (n === 0) break;
        this.push(this.buffer.subarray(0, n));
        this.buffer = this.buffer.subarray(n);
        this.passThrough -= n;
        continue;
      }
      if (this.buffer.length < 12) break;
      const magic = this.buffer.readUInt32LE(0);
      const isSkippable = (magic & 0xfffffff0) >>> 0 === 0x184d2a50;
      if (!isSkippable) {
        // A plain zstd stream with no size hints: hand over everything from here on.
        this.passThrough = Number.POSITIVE_INFINITY;
        continue;
      }
      const size = this.buffer.readUInt32LE(4);
      if (size === 4) {
        // Size hint: the next `hint` bytes are one complete compressed frame.
        this.passThrough = this.buffer.readUInt32LE(8);
        this.buffer = this.buffer.subarray(12);
        continue;
      }
      if (this.buffer.length < 8 + size) break;
      this.buffer = this.buffer.subarray(8 + size);
    }
    done();
  }

  _flush(done: TransformCallback) {
    if (this.buffer.length) this.push(this.buffer);
    done();
  }
}

/** Replays the puzzle and confirms it really ends in checkmate. */
function isValidMate(fen: string, moves: string[], mateIn: number): boolean {
  if (moves.length !== mateIn * 2) return false;
  try {
    const chess = new Chess(fen);
    for (const uci of moves) {
      chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci[4] : undefined,
      });
    }
    return chess.isCheckmate();
  } catch {
    return false;
  }
}

async function openSource(): Promise<Readable> {
  const fileFlag = process.argv.indexOf("--file");
  if (fileFlag !== -1 && process.argv[fileFlag + 1]) {
    const path = resolve(process.argv[fileFlag + 1]);
    console.log(`Reading ${path}`);
    return createReadStream(path);
  }
  console.log(`Downloading ${URL} (about 300 MB, streamed)…`);
  const res = await fetch(URL);
  if (!res.ok || !res.body) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }
  return Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]);
}

async function main() {
  const random = mulberry32(20240501);
  const withOpening = new Map<MateTheme, Reservoir<PuzzleRecord>>();
  const withoutOpening = new Map<MateTheme, Reservoir<PuzzleRecord>>();
  for (const theme of THEMES) {
    withOpening.set(theme, new Reservoir(WITH_OPENING_PER_THEME, random));
    withoutOpening.set(theme, new Reservoir(PER_THEME, random));
  }

  const source = await openSource();
  const stripper = new StripSkippableFrames();
  const decompressed = createZstdDecompress();
  const fail = (err: unknown) => {
    console.error("Stream error:", err);
    process.exit(1);
  };
  source.on("error", fail);
  stripper.on("error", fail);
  decompressed.on("error", fail);
  const lines = createInterface({
    input: source.pipe(stripper).pipe(decompressed),
    crlfDelay: Infinity,
  });

  let rows = 0;
  let columns: Record<string, number> | null = null;

  for await (const line of lines) {
    if (!columns) {
      // PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
      columns = Object.fromEntries(line.split(",").map((name, i) => [name, i]));
      for (const needed of ["PuzzleId", "FEN", "Moves", "Rating", "Popularity", "Themes", "OpeningTags"]) {
        if (!(needed in columns)) throw new Error(`Missing column ${needed}`);
      }
      continue;
    }
    rows++;
    if (rows % 1_000_000 === 0) console.log(`  …${rows / 1_000_000}M rows`);

    const cells = line.split(",");
    const rating = Number(cells[columns.Rating]);
    if (!(rating >= MIN_RATING && rating <= MAX_RATING)) continue;
    if (!(Number(cells[columns.Popularity]) > MIN_POPULARITY)) continue;

    const themes = cells[columns.Themes].split(" ");
    const theme = THEMES.find((t) => themes.includes(t));
    if (!theme) continue;

    const mateIn = Number(theme.slice(-1)) as 1 | 2 | 3;
    const record: PuzzleRecord = {
      id: cells[columns.PuzzleId],
      fen: cells[columns.FEN],
      moves: cells[columns.Moves].split(" "),
      rating,
      mateIn,
      openingTags: (cells[columns.OpeningTags] ?? "").split(" ").filter(Boolean),
    };

    const bucket = record.openingTags.length > 0 ? withOpening : withoutOpening;
    bucket.get(theme)!.offer(record);
  }

  const puzzles: PuzzleRecord[] = [];
  for (const theme of THEMES) {
    const tagged = withOpening.get(theme)!.items.filter((p) => isValidMate(p.fen, p.moves, p.mateIn));
    const untagged = withoutOpening.get(theme)!.items.filter((p) => isValidMate(p.fen, p.moves, p.mateIn));
    const picked = [...tagged, ...untagged].slice(0, PER_THEME);
    console.log(
      `${theme}: kept ${picked.length} (${Math.min(tagged.length, picked.length)} with an opening tag) ` +
        `from ${withOpening.get(theme)!.seen + withoutOpening.get(theme)!.seen} matching rows`,
    );
    puzzles.push(...picked);
  }

  if (puzzles.length < PER_THEME * THEMES.length) {
    throw new Error(
      `Only found ${puzzles.length} puzzles (wanted ${PER_THEME * THEMES.length}). Nothing was written.`,
    );
  }

  puzzles.sort((a, b) => a.mateIn - b.mateIn || a.rating - b.rating || a.id.localeCompare(b.id));
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(puzzles));
  console.log(`✓ Scanned ${rows} rows, wrote ${puzzles.length} puzzles to data/puzzles.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
