import { describe, expect, it } from "vitest";
import { State } from "ts-fsrs";
import { daysUntilDue, endOfToday, isDue, isNew, newCard, reviewCard } from "@/lib/srs";
import { currentStreak, dateKey, dueKeys, levelInfo, longestStreak, weakestLines, type CardProgress } from "@/lib/progress-utils";

const DAY = 86_400_000;
const T0 = new Date(2025, 0, 6, 10, 0, 0).getTime();

describe("FSRS scheduling", () => {
  it("a new card is new and due straight away", () => {
    const card = newCard(T0);
    expect(isNew(card)).toBe(true);
    expect(isNew(undefined)).toBe(true);
    expect(isDue(card, T0)).toBe(true);
    expect(card.reps).toBe(0);
  });

  it("'good' on a new card schedules it later, not now", () => {
    const card = reviewCard(undefined, "good", T0);
    expect(card.reps).toBe(1);
    expect(card.due).toBeGreaterThan(T0);
    expect(card.state).not.toBe(State.New);
    expect(isDue(card, T0)).toBe(false);
    expect(card.lastReview).toBe(T0);
  });

  it("'again' brings a card back sooner than 'good', and 'easy' pushes it furthest", () => {
    const again = reviewCard(undefined, "again", T0);
    const good = reviewCard(undefined, "good", T0);
    const easy = reviewCard(undefined, "easy", T0);
    expect(again.due).toBeLessThan(good.due);
    expect(good.due).toBeLessThan(easy.due);
  });

  it("intervals grow when you keep answering correctly", () => {
    let card = reviewCard(undefined, "good", T0);
    const intervals: number[] = [];
    let now = T0;
    for (let i = 0; i < 6; i++) {
      now = card.due;
      const next = reviewCard(card, "good", now);
      intervals.push(next.due - now);
      card = next;
    }
    expect(card.state).toBe(State.Review);
    const last = intervals[intervals.length - 1];
    expect(last).toBeGreaterThan(7 * DAY);
    // Once in review, each interval is longer than the one before.
    const reviewIntervals = intervals.filter((i) => i >= DAY);
    for (let i = 1; i < reviewIntervals.length; i++) {
      expect(reviewIntervals[i]).toBeGreaterThan(reviewIntervals[i - 1]);
    }
  });

  it("forgetting a mature card counts a lapse and shortens the interval", () => {
    let card = reviewCard(undefined, "good", T0);
    for (let i = 0; i < 5; i++) card = reviewCard(card, "good", card.due);
    const before = card;
    const lapsed = reviewCard(before, "again", before.due);
    expect(lapsed.lapses).toBe(before.lapses + 1);
    expect(lapsed.due - before.due).toBeLessThan(before.scheduledDays * DAY);
    expect(lapsed.stability).toBeLessThan(before.stability);
  });

  it("is deterministic (no random fuzz)", () => {
    expect(reviewCard(undefined, "good", T0)).toEqual(reviewCard(undefined, "good", T0));
  });

  it("survives a JSON round trip (localStorage)", () => {
    const card = reviewCard(undefined, "good", T0);
    const restored = JSON.parse(JSON.stringify(card));
    expect(reviewCard(restored, "good", card.due)).toEqual(reviewCard(card, "good", card.due));
  });

  it("reports days until due", () => {
    const card = { ...newCard(T0), due: T0 + 3 * DAY };
    expect(daysUntilDue(card, T0)).toBe(3);
    expect(daysUntilDue(card, T0 + 10 * DAY)).toBe(0);
  });
});

describe("due cards", () => {
  const make = (due: number): CardProgress => ({
    srs: { ...newCard(T0), due },
    openingId: "o",
    lineId: "o/main",
    right: 0,
    wrong: 0,
  });

  it("includes everything due by the end of today, soonest first", () => {
    const cards = {
      later: make(T0 + 3 * DAY),
      overdue: make(T0 - 2 * DAY),
      tonight: make(endOfToday(T0) - 1000),
      now: make(T0),
    };
    expect(dueKeys(cards, T0)).toEqual(["overdue", "now", "tonight"]);
  });
});

describe("streaks and levels", () => {
  const day = (offset: number) => dateKey(T0 + offset * DAY);
  const active = { answers: 5, correct: 4, xp: 40 };

  it("counts consecutive days ending today", () => {
    const activity = { [day(0)]: active, [day(-1)]: active, [day(-2)]: active, [day(-4)]: active };
    expect(currentStreak(activity, T0)).toBe(3);
    expect(longestStreak(activity)).toBe(3);
  });

  it("keeps yesterday's streak alive until the end of today", () => {
    const activity = { [day(-1)]: active, [day(-2)]: active };
    expect(currentStreak(activity, T0)).toBe(2);
  });

  it("resets after a missed day", () => {
    expect(currentStreak({ [day(-2)]: active }, T0)).toBe(0);
    expect(currentStreak({}, T0)).toBe(0);
  });

  it("computes levels from XP", () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, xpIntoLevel: 0, xpForLevel: 100 });
    expect(levelInfo(99).level).toBe(1);
    expect(levelInfo(100).level).toBe(2);
    expect(levelInfo(300).level).toBe(3);
    expect(levelInfo(350)).toMatchObject({ level: 3, xpIntoLevel: 50, xpForLevel: 300 });
  });

  it("finds the weakest lines", () => {
    const card = (lineId: string, right: number, wrong: number): CardProgress => ({
      srs: newCard(T0),
      openingId: "o",
      lineId,
      right,
      wrong,
    });
    const rows = weakestLines({ a: card("o/good", 9, 1), b: card("o/bad", 1, 4), c: card("o/perfect", 5, 0), d: card("o/few", 0, 1) });
    expect(rows.map((r) => r.id)).toEqual(["o/bad", "o/good"]);
    expect(rows[0].accuracy).toBe(20);
  });
});
