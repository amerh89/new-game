"use client";

import { useMemo } from "react";
import { buildDeck, type TrainCard } from "@/lib/training/engine";
import { dueKeys } from "@/lib/progress-utils";
import { useProgress } from "@/store/progress";
import { useRepertoire } from "@/hooks/use-data";
import type { ResolvedLine } from "@/lib/curated";

export interface TrainingOverview {
  ready: boolean;
  /** Every position you must know, across your whole repertoire. */
  deck: TrainCard[];
  /** Cards to review today, most overdue first. */
  due: TrainCard[];
  /** Repertoire lines you have not completed in Learn mode yet. */
  unlearned: ResolvedLine[];
  lines: ResolvedLine[];
  /** How many deck cards you have seen at least once. */
  seen: number;
}

export function useTraining(): TrainingOverview {
  const { lines, ready } = useRepertoire();
  const cards = useProgress((s) => s.cards);
  const learnedLines = useProgress((s) => s.learnedLines);

  return useMemo(() => {
    const deck = buildDeck(lines);
    const byKey = new Map(deck.map((c) => [c.key, c]));
    const due = dueKeys(cards)
      .map((key) => byKey.get(key))
      .filter((c): c is TrainCard => Boolean(c));
    return {
      ready,
      deck,
      due,
      unlearned: lines.filter((l) => !learnedLines[l.id]),
      lines,
      seen: deck.filter((c) => cards[c.key]).length,
    };
  }, [lines, ready, cards, learnedLines]);
}
