"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { starterRepertoire } from "../../data/curated";
import { reviewCard, type GradeName } from "@/lib/srs";
import {
  dateKey,
  XP,
  type CardProgress,
  type DayActivity,
  type QuizRecord,
} from "@/lib/progress-utils";
import type { Side } from "@/lib/types";

/** Everything that is saved (and synced, if Supabase is set up). */
export interface ProgressData {
  cards: Record<string, CardProgress>;
  /** lineId -> time you first completed it in Learn mode. */
  learnedLines: Record<string, number>;
  activity: Record<string, DayActivity>;
  xp: number;
  quizHistory: QuizRecord[];
  /** Best score (percent) per quiz type. */
  bestScores: Record<string, number>;
  puzzles: Record<string, { solved: boolean; attempts: number; clean: boolean }>;
  trapsDone: Record<string, number>;
  patternsDone: Record<string, number>;
  /** Curated ids, or "lib:<id>" for openings added from the library. */
  repertoire: Record<Side, string[]>;
  updatedAt: number;
}

interface CardRef {
  key: string;
  openingId: string;
  lineId: string;
}

interface ProgressActions {
  /** Records an answer. With schedule=true the FSRS card is (re)scheduled. */
  gradeCard: (card: CardRef, grade: GradeName, options?: { schedule?: boolean }) => void;
  markLineLearned: (lineId: string) => void;
  recordQuiz: (record: Omit<QuizRecord, "date">) => void;
  recordPuzzle: (id: string, solved: boolean, clean: boolean, mateIn: number) => void;
  markTrapDone: (id: string) => void;
  markPatternDone: (id: string) => void;
  addToRepertoire: (side: Side, id: string) => void;
  removeFromRepertoire: (side: Side, id: string) => void;
  resetRepertoire: () => void;
  resetAll: () => void;
  replaceAll: (data: ProgressData) => void;
}

export type ProgressState = ProgressData & ProgressActions;

export function emptyProgress(): ProgressData {
  return {
    cards: {},
    learnedLines: {},
    activity: {},
    xp: 0,
    quizHistory: [],
    bestScores: {},
    puzzles: {},
    trapsDone: {},
    patternsDone: {},
    repertoire: {
      white: [...starterRepertoire.white],
      black: [...starterRepertoire.black],
    },
    updatedAt: 0,
  };
}

function bump(
  activity: Record<string, DayActivity>,
  now: number,
  answers: number,
  correct: number,
  xp: number,
): Record<string, DayActivity> {
  const key = dateKey(now);
  const day = activity[key] ?? { answers: 0, correct: 0, xp: 0 };
  return {
    ...activity,
    [key]: { answers: day.answers + answers, correct: day.correct + correct, xp: day.xp + xp },
  };
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      ...emptyProgress(),

      gradeCard: (card, grade, options) =>
        set((state) => {
          const now = Date.now();
          const existing = state.cards[card.key];
          const correct = grade !== "again";
          const schedule = options?.schedule ?? true;
          const xp = correct ? XP.cardCorrect : XP.cardWrong;
          // Drill answers count towards accuracy but never create or reschedule cards.
          if (!schedule && !existing) {
            return {
              xp: state.xp + xp,
              activity: bump(state.activity, now, 1, correct ? 1 : 0, xp),
              updatedAt: now,
            };
          }
          const next: CardProgress = {
            srs: schedule ? reviewCard(existing?.srs, grade, now) : existing!.srs,
            openingId: card.openingId,
            lineId: existing?.lineId ?? card.lineId,
            right: (existing?.right ?? 0) + (correct ? 1 : 0),
            wrong: (existing?.wrong ?? 0) + (correct ? 0 : 1),
          };
          return {
            cards: { ...state.cards, [card.key]: next },
            xp: state.xp + xp,
            activity: bump(state.activity, now, 1, correct ? 1 : 0, xp),
            updatedAt: now,
          };
        }),

      markLineLearned: (lineId) =>
        set((state) => {
          if (state.learnedLines[lineId]) return state;
          const now = Date.now();
          return {
            learnedLines: { ...state.learnedLines, [lineId]: now },
            xp: state.xp + XP.lineLearned,
            activity: bump(state.activity, now, 0, 0, XP.lineLearned),
            updatedAt: now,
          };
        }),

      recordQuiz: (record) =>
        set((state) => {
          const now = Date.now();
          const percent = record.total === 0 ? 0 : Math.round((record.score / record.total) * 100);
          const xp = record.score * XP.quizCorrect;
          return {
            quizHistory: [{ ...record, date: now }, ...state.quizHistory].slice(0, 100),
            bestScores: {
              ...state.bestScores,
              [record.type]: Math.max(state.bestScores[record.type] ?? 0, percent),
            },
            xp: state.xp + xp,
            activity: bump(state.activity, now, record.total, record.score, xp),
            updatedAt: now,
          };
        }),

      recordPuzzle: (id, solved, clean, mateIn) =>
        set((state) => {
          const now = Date.now();
          const prev = state.puzzles[id];
          const firstSolve = solved && !prev?.solved;
          const xp = firstSolve ? XP.puzzlePerMove * mateIn : 0;
          return {
            puzzles: {
              ...state.puzzles,
              [id]: {
                solved: solved || Boolean(prev?.solved),
                attempts: (prev?.attempts ?? 0) + 1,
                clean: prev?.clean ?? clean,
              },
            },
            xp: state.xp + xp,
            activity: bump(state.activity, now, 1, clean ? 1 : 0, xp),
            updatedAt: now,
          };
        }),

      markTrapDone: (id) =>
        set((state) => {
          const now = Date.now();
          const first = !state.trapsDone[id];
          return {
            trapsDone: { ...state.trapsDone, [id]: now },
            xp: state.xp + (first ? XP.lesson : 0),
            activity: bump(state.activity, now, 1, 1, first ? XP.lesson : 0),
            updatedAt: now,
          };
        }),

      markPatternDone: (id) =>
        set((state) => {
          const now = Date.now();
          const first = !state.patternsDone[id];
          return {
            patternsDone: { ...state.patternsDone, [id]: now },
            xp: state.xp + (first ? XP.lesson : 0),
            activity: bump(state.activity, now, 1, 1, first ? XP.lesson : 0),
            updatedAt: now,
          };
        }),

      addToRepertoire: (side, id) =>
        set((state) => {
          if (state.repertoire[side].includes(id)) return state;
          return {
            repertoire: { ...state.repertoire, [side]: [...state.repertoire[side], id] },
            updatedAt: Date.now(),
          };
        }),

      removeFromRepertoire: (side, id) =>
        set((state) => ({
          repertoire: { ...state.repertoire, [side]: state.repertoire[side].filter((x) => x !== id) },
          updatedAt: Date.now(),
        })),

      resetRepertoire: () =>
        set(() => ({ repertoire: emptyProgress().repertoire, updatedAt: Date.now() })),

      resetAll: () => set(() => ({ ...emptyProgress(), updatedAt: Date.now() })),

      replaceAll: (data) => set(() => ({ ...emptyProgress(), ...data })),
    }),
    { name: "openingspro-progress", version: 1, skipHydration: true },
  ),
);

/** The plain data (no functions) — this is what gets synced. */
export function selectProgressData(state: ProgressState): ProgressData {
  return {
    cards: state.cards,
    learnedLines: state.learnedLines,
    activity: state.activity,
    xp: state.xp,
    quizHistory: state.quizHistory,
    bestScores: state.bestScores,
    puzzles: state.puzzles,
    trapsDone: state.trapsDone,
    patternsDone: state.patternsDone,
    repertoire: state.repertoire,
    updatedAt: state.updatedAt,
  };
}
