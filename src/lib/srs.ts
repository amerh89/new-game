import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card,
  type Grade,
} from "ts-fsrs";

/** JSON-friendly copy of an FSRS card (dates stored as milliseconds). */
export interface StoredCard {
  due: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview?: number;
}

export type GradeName = "again" | "hard" | "good" | "easy";

const GRADES: Record<GradeName, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

// Fuzz is off so the schedule is predictable (and testable).
const scheduler = fsrs(generatorParameters({ enable_fuzz: false, request_retention: 0.9 }));

function toStored(card: Card): StoredCard {
  return {
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review?.getTime(),
  };
}

function fromStored(stored: StoredCard): Card {
  return {
    due: new Date(stored.due),
    stability: stored.stability,
    difficulty: stored.difficulty,
    elapsed_days: stored.elapsedDays,
    scheduled_days: stored.scheduledDays,
    learning_steps: stored.learningSteps,
    reps: stored.reps,
    lapses: stored.lapses,
    state: stored.state as State,
    last_review: stored.lastReview ? new Date(stored.lastReview) : undefined,
  };
}

export function newCard(now: number = Date.now()): StoredCard {
  return toStored(createEmptyCard(new Date(now)));
}

/** Applies one review and returns the rescheduled card. */
export function reviewCard(
  stored: StoredCard | undefined,
  grade: GradeName,
  now: number = Date.now(),
): StoredCard {
  const card = stored ? fromStored(stored) : createEmptyCard(new Date(now));
  const { card: next } = scheduler.next(card, new Date(now), GRADES[grade]);
  return toStored(next);
}

export function isDue(stored: StoredCard, now: number = Date.now()): boolean {
  return stored.due <= now;
}

export function isNew(stored: StoredCard | undefined): boolean {
  return !stored || stored.state === State.New;
}

/** Days until the card comes back (0 = today). */
export function daysUntilDue(stored: StoredCard, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((stored.due - now) / 86_400_000));
}

/** End of the local day — cards due later today count as "due today". */
export function endOfToday(now: number = Date.now()): number {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
