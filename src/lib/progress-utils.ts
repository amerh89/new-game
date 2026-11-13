import { endOfToday, type StoredCard } from "./srs";

export interface CardProgress {
  srs: StoredCard;
  openingId: string;
  lineId: string;
  right: number;
  wrong: number;
}

export interface DayActivity {
  /** Positions answered (training + puzzles + quiz questions). */
  answers: number;
  correct: number;
  xp: number;
}

export interface QuizRecord {
  /** Quiz type, or "test" for the timed test. */
  type: string;
  score: number;
  total: number;
  date: number;
  seconds?: number;
}

export const XP = {
  cardCorrect: 10,
  cardWrong: 2,
  lineLearned: 25,
  quizCorrect: 5,
  puzzlePerMove: 10,
  lesson: 20,
};

/** Local calendar day, e.g. "2025-03-09". */
export function dateKey(time: number | Date = Date.now()): string {
  const d = typeof time === "number" ? new Date(time) : time;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Days in a row with activity, counting back from today.
 * If you have not practised yet today, yesterday's streak is still alive.
 */
export function currentStreak(activity: Record<string, DayActivity>, now: number = Date.now()): number {
  const active = (d: Date) => (activity[dateKey(d)]?.answers ?? 0) > 0;
  let cursor = new Date(now);
  if (!active(cursor)) cursor = addDays(cursor, -1);
  let streak = 0;
  while (active(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(activity: Record<string, DayActivity>): number {
  const days = Object.keys(activity)
    .filter((k) => activity[k].answers > 0)
    .sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of days) {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    run = prev && dateKey(addDays(prev, 1)) === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = date;
  }
  return best;
}

/** Level n needs 100 × n × (n − 1) / 2 XP: 0, 100, 300, 600, 1000, … */
export function levelInfo(xp: number) {
  const level = Math.floor((1 + Math.sqrt(1 + (8 * xp) / 100)) / 2);
  const floor = (100 * level * (level - 1)) / 2;
  const next = (100 * (level + 1) * level) / 2;
  return {
    level,
    xpIntoLevel: xp - floor,
    xpForLevel: next - floor,
    progress: (xp - floor) / (next - floor),
  };
}

/** Keys of cards that are due by the end of today. */
export function dueKeys(cards: Record<string, CardProgress>, now: number = Date.now()): string[] {
  const limit = endOfToday(now);
  return Object.keys(cards)
    .filter((key) => cards[key].srs.due <= limit)
    .sort((a, b) => cards[a].srs.due - cards[b].srs.due);
}

export interface AccuracyRow {
  id: string;
  right: number;
  wrong: number;
  total: number;
  accuracy: number;
}

function toRows(groups: Map<string, { right: number; wrong: number }>): AccuracyRow[] {
  return [...groups.entries()].map(([id, { right, wrong }]) => ({
    id,
    right,
    wrong,
    total: right + wrong,
    accuracy: right + wrong === 0 ? 0 : Math.round((right / (right + wrong)) * 100),
  }));
}

export function accuracyBy(
  cards: Record<string, CardProgress>,
  field: "openingId" | "lineId",
): AccuracyRow[] {
  const groups = new Map<string, { right: number; wrong: number }>();
  for (const card of Object.values(cards)) {
    const g = groups.get(card[field]) ?? { right: 0, wrong: 0 };
    g.right += card.right;
    g.wrong += card.wrong;
    groups.set(card[field], g);
  }
  return toRows(groups);
}

/** Lines you get wrong most often (at least 3 answers), worst first. */
export function weakestLines(cards: Record<string, CardProgress>, limit = 5): AccuracyRow[] {
  return accuracyBy(cards, "lineId")
    .filter((row) => row.total >= 3 && row.wrong > 0)
    .sort((a, b) => a.accuracy - b.accuracy || b.wrong - a.wrong)
    .slice(0, limit);
}

/** The last `weeks` weeks as rows of 7 days (Monday first), oldest week first. */
export function calendarWeeks(now: number = Date.now(), weeks = 12): { key: string; future: boolean }[][] {
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  const mondayOffset = (today.getDay() + 6) % 7;
  const start = addDays(today, -mondayOffset - (weeks - 1) * 7);
  const out: { key: string; future: boolean }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const row: { key: string; future: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      row.push({ key: dateKey(date), future: date.getTime() > today.getTime() });
    }
    out.push(row);
  }
  return out;
}
