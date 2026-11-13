import type { LibraryOpening, Puzzle } from "./types";

/**
 * The big data files are loaded on demand so the first screen stays fast.
 * They are bundled with the app, so they also work offline.
 */
let libraryPromise: Promise<LibraryOpening[]> | null = null;
let puzzlesPromise: Promise<Puzzle[]> | null = null;

export function loadLibrary(): Promise<LibraryOpening[]> {
  libraryPromise ??= import("../../data/openings.json").then(
    (m) => m.default as LibraryOpening[],
  );
  return libraryPromise;
}

export function loadPuzzles(): Promise<Puzzle[]> {
  puzzlesPromise ??= import("../../data/puzzles.json").then((m) => m.default as Puzzle[]);
  return puzzlesPromise;
}
