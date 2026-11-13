"use client";

import { useEffect, useMemo, useState } from "react";
import { loadLibrary, loadPuzzles } from "@/lib/data";
import { getCurated, getTrainingLines, libraryLine, type ResolvedLine } from "@/lib/curated";
import { useProgress } from "@/store/progress";
import type { LibraryOpening, Puzzle, Side } from "@/lib/types";

export function useLibrary(): LibraryOpening[] | null {
  const [library, setLibrary] = useState<LibraryOpening[] | null>(null);
  useEffect(() => {
    let alive = true;
    void loadLibrary().then((data) => {
      if (alive) setLibrary(data);
    });
    return () => {
      alive = false;
    };
  }, []);
  return library;
}

export function usePuzzles(): Puzzle[] | null {
  const [puzzles, setPuzzles] = useState<Puzzle[] | null>(null);
  useEffect(() => {
    let alive = true;
    void loadPuzzles().then((data) => {
      if (alive) setPuzzles(data);
    });
    return () => {
      alive = false;
    };
  }, []);
  return puzzles;
}

export interface RepertoireEntry {
  /** Curated id or "lib:<id>". */
  id: string;
  side: Side;
  name: string;
  eco: string;
  curated: boolean;
  lines: ResolvedLine[];
}

/**
 * Your repertoire with its trainable lines.
 * `ready` is false while openings added from the library are still loading.
 */
export function useRepertoire(): { entries: RepertoireEntry[]; lines: ResolvedLine[]; ready: boolean } {
  const repertoire = useProgress((s) => s.repertoire);
  const needsLibrary = [...repertoire.white, ...repertoire.black].some((id) => id.startsWith("lib:"));
  const [library, setLibrary] = useState<LibraryOpening[] | null>(null);

  useEffect(() => {
    if (!needsLibrary) return;
    let alive = true;
    void loadLibrary().then((data) => {
      if (alive) setLibrary(data);
    });
    return () => {
      alive = false;
    };
  }, [needsLibrary]);

  return useMemo(() => {
    const entries: RepertoireEntry[] = [];
    for (const side of ["white", "black"] as const) {
      for (const id of repertoire[side]) {
        if (id.startsWith("lib:")) {
          const opening = library?.find((o) => o.id === id.slice(4));
          if (!opening) continue;
          entries.push({
            id,
            side,
            name: opening.name,
            eco: opening.eco,
            curated: false,
            lines: [libraryLine(opening, side)],
          });
        } else {
          const opening = getCurated(id);
          if (!opening) continue;
          entries.push({
            id,
            side,
            name: opening.name,
            eco: opening.eco,
            curated: true,
            lines: getTrainingLines(id),
          });
        }
      }
    }
    return {
      entries,
      lines: entries.flatMap((e) => e.lines),
      ready: !needsLibrary || library !== null,
    };
  }, [repertoire, library, needsLibrary]);
}
