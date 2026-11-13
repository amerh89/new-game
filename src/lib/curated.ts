import { curatedOpenings, traps, patterns, starterRepertoire } from "../../data/curated";
import type {
  CuratedLineSource,
  CuratedOpening,
  LibraryOpening,
  MatePattern,
  Side,
  Trap,
} from "./types";

/** A line with every explanation filled in, ready for the explorer and trainer. */
export interface ResolvedLine {
  /** `${openingId}/${lineId}` */
  id: string;
  openingId: string;
  openingName: string;
  name: string;
  intro: string;
  side: Side;
  sans: string[];
  notes: string[];
  arrows: (string[] | undefined)[];
  isMain: boolean;
}

/**
 * Sidelines only explain the moves after they leave a line that came before
 * them. Shared opening moves inherit their explanation from that earlier line.
 */
export function resolveLines(opening: CuratedOpening): ResolvedLine[] {
  const notesByPrefix = new Map<string, { why: string; arrows?: string[] }>();
  const sources: CuratedLineSource[] = [opening.mainLine, ...opening.sidelines];

  return sources.map((source, index) => {
    const sans: string[] = [];
    const notes: string[] = [];
    const arrows: (string[] | undefined)[] = [];
    source.moves.forEach(([san, why, moveArrows]) => {
      sans.push(san);
      const prefix = sans.join(" ");
      if (why) {
        if (!notesByPrefix.has(prefix)) notesByPrefix.set(prefix, { why, arrows: moveArrows });
        notes.push(why);
        arrows.push(moveArrows);
      } else {
        const inherited = notesByPrefix.get(prefix);
        notes.push(inherited?.why ?? "");
        arrows.push(inherited?.arrows);
      }
    });
    return {
      id: `${opening.id}/${source.id}`,
      openingId: opening.id,
      openingName: opening.name,
      name: source.name,
      intro: source.intro,
      side: opening.side,
      sans,
      notes,
      arrows,
      isMain: index === 0,
    };
  });
}

const curatedById = new Map(curatedOpenings.map((o) => [o.id, o]));
const linesCache = new Map<string, ResolvedLine[]>();

export function getCuratedOpenings(): CuratedOpening[] {
  return curatedOpenings;
}

export function getCurated(id: string): CuratedOpening | undefined {
  return curatedById.get(id);
}

export function getLines(openingId: string): ResolvedLine[] {
  const cached = linesCache.get(openingId);
  if (cached) return cached;
  const opening = curatedById.get(openingId);
  if (!opening) return [];
  const lines = resolveLines(opening);
  linesCache.set(openingId, lines);
  return lines;
}

/**
 * Lines used for training. Recognise-only openings only train their main line,
 * because their sidelines show choices for both sides.
 */
export function getTrainingLines(openingId: string): ResolvedLine[] {
  const opening = curatedById.get(openingId);
  if (!opening) return [];
  const lines = getLines(openingId);
  return opening.trainable ? lines : lines.slice(0, 1);
}

/** Turns a library (Lichess) opening into a single trainable line. */
export function libraryLine(opening: LibraryOpening, side: Side = opening.side): ResolvedLine {
  const sans = opening.moves.split(" ").filter(Boolean);
  return {
    id: `lib:${opening.id}/main`,
    openingId: `lib:${opening.id}`,
    openingName: opening.name,
    name: opening.name,
    intro: `${opening.eco} · ${opening.name}`,
    side,
    sans,
    notes: sans.map(() => ""),
    arrows: sans.map(() => undefined),
    isMain: true,
  };
}

export function getTraps(): Trap[] {
  return traps;
}

export function getTrap(id: string): Trap | undefined {
  return traps.find((t) => t.id === id);
}

export function getPatterns(): MatePattern[] {
  return patterns;
}

export function getPattern(id: string): MatePattern | undefined {
  return patterns.find((p) => p.id === id);
}

export { starterRepertoire };

export const GROUP_LABELS: Record<CuratedOpening["group"], string> = {
  white: "Playing White",
  "black-e4": "Black against 1.e4",
  "black-d4": "Black against 1.d4",
  recognize: "Good to recognise",
};
