"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight, Flame, Sparkles, Target, Trash2, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRepertoire } from "@/hooks/use-data";
import { getCurated, getCuratedOpenings, getLines } from "@/lib/curated";
import {
  accuracyBy,
  calendarWeeks,
  currentStreak,
  dateKey,
  levelInfo,
  longestStreak,
  weakestLines,
} from "@/lib/progress-utils";
import { QUIZ_TITLES } from "@/lib/quiz";
import { useProgress } from "@/store/progress";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function heat(answers: number) {
  if (answers === 0) return "bg-surface-2";
  if (answers < 10) return "bg-primary/30";
  if (answers < 25) return "bg-primary/60";
  return "bg-primary";
}

export default function ProgressPage() {
  const cards = useProgress((s) => s.cards);
  const activity = useProgress((s) => s.activity);
  const xp = useProgress((s) => s.xp);
  const quizHistory = useProgress((s) => s.quizHistory);
  const resetAll = useProgress((s) => s.resetAll);
  const { entries } = useRepertoire();

  const names = useMemo(() => {
    const openings = new Map<string, string>();
    const lines = new Map<string, { name: string; opening: string }>();
    for (const o of getCuratedOpenings()) {
      openings.set(o.id, o.name);
      for (const l of getLines(o.id)) lines.set(l.id, { name: l.isMain ? "Main line" : l.name, opening: o.name });
    }
    for (const e of entries) {
      openings.set(e.id, e.name);
      for (const l of e.lines) if (!lines.has(l.id)) lines.set(l.id, { name: "Main line", opening: e.name });
    }
    return { openings, lines };
  }, [entries]);

  const level = levelInfo(xp);
  const streak = currentStreak(activity);
  const best = longestStreak(activity);
  const totals = Object.values(cards).reduce(
    (acc, c) => ({ right: acc.right + c.right, wrong: acc.wrong + c.wrong }),
    { right: 0, wrong: 0 },
  );
  const overall = totals.right + totals.wrong === 0 ? null : Math.round((totals.right / (totals.right + totals.wrong)) * 100);

  const byOpening = accuracyBy(cards, "openingId")
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
  const weakest = weakestLines(cards);
  const weeks = calendarWeeks();
  const today = dateKey();
  const activeDays = Object.values(activity).filter((d) => d.answers > 0).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Progress" subtitle="How your training is going" back="/" />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <Flame className="size-5 text-accent" />
          <p className="mt-2 text-2xl font-bold tabular-nums">{streak}</p>
          <p className="text-xs text-muted">day streak · best {best}</p>
        </Card>
        <Card className="p-4">
          <Sparkles className="size-5 text-primary" />
          <p className="mt-2 text-2xl font-bold tabular-nums">Level {level.level}</p>
          <p className="text-xs text-muted">{xp} XP in total</p>
        </Card>
        <Card className="p-4">
          <Target className="size-5 text-info" />
          <p className="mt-2 text-2xl font-bold tabular-nums">{overall === null ? "—" : `${overall}%`}</p>
          <p className="text-xs text-muted">overall accuracy</p>
        </Card>
        <Card className="p-4">
          <TrendingDown className="size-5 rotate-180 -scale-x-100 text-primary" />
          <p className="mt-2 text-2xl font-bold tabular-nums">{Object.keys(cards).length}</p>
          <p className="text-xs text-muted">positions learned</p>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Streak calendar</h2>
        <Card className="p-4" data-testid="streak-calendar">
          <div className="flex gap-1.5">
            <div className="flex flex-col gap-1.5 pr-1">
              {WEEKDAYS.map((d, i) => (
                <span key={i} className="flex h-full min-h-4 items-center text-[10px] font-semibold text-muted">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid flex-1 grid-flow-col grid-rows-7 gap-1.5">
              {weeks.flatMap((week) =>
                week.map((day) => {
                  const answers = activity[day.key]?.answers ?? 0;
                  return (
                    <div
                      key={day.key}
                      title={`${day.key}: ${answers} answers`}
                      className={cn(
                        "aspect-square w-full max-w-7 rounded-[5px]",
                        day.future ? "bg-transparent" : heat(answers),
                        day.key === today && "ring-2 ring-foreground/60 ring-offset-1 ring-offset-surface",
                      )}
                    />
                  );
                }),
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted">
            <span>
              Last 12 weeks · {activeDays} active day{activeDays === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-1">
              Less
              {[0, 5, 15, 30].map((n) => (
                <span key={n} className={cn("size-3 rounded-[3px]", heat(n))} />
              ))}
              More
            </span>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Accuracy by opening</h2>
        {byOpening.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-5 text-center text-sm text-muted">
            <p>No training yet. Your accuracy will show up here once you have learned a line.</p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/train">Learn your first line</Link>
            </Button>
          </Card>
        ) : (
          <Card className="flex flex-col gap-4 p-4">
            {byOpening.map((row) => (
              <div key={row.id} data-testid="accuracy-row">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[15px] font-medium">{names.openings.get(row.id) ?? row.id}</span>
                  <span className="shrink-0 text-sm tabular-nums text-muted">
                    <span className="font-bold text-foreground">{row.accuracy}%</span> · {row.total} answers
                  </span>
                </div>
                <Progress
                  value={row.accuracy / 100}
                  tone={row.accuracy >= 80 ? "primary" : row.accuracy >= 60 ? "accent" : "danger"}
                />
              </div>
            ))}
          </Card>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Weakest lines</h2>
        {weakest.length === 0 ? (
          <Card className="p-5 text-center text-sm text-muted">
            Nothing to worry about yet. Lines you keep getting wrong will be listed here.
          </Card>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
            {weakest.map((row) => {
              const info = names.lines.get(row.id);
              const openingId = row.id.split("/")[0];
              const drillable = Boolean(getCurated(openingId)) || entries.some((e) => e.id === openingId);
              const content = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{info?.opening ?? openingId}</span>
                    <span className="block truncate text-xs text-muted">{info?.name ?? "Line"}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-sm font-bold text-danger">{row.accuracy}%</span>
                    <span className="block text-xs text-muted">{row.wrong} missed</span>
                  </span>
                  {drillable && <ChevronRight className="size-4 shrink-0 text-muted" />}
                </>
              );
              return (
                <li key={row.id} className="border-b border-border last:border-b-0">
                  {drillable ? (
                    <Link
                      href={`/train/session?mode=learn&line=${encodeURIComponent(row.id)}`}
                      className="flex min-h-14 items-center gap-3 px-4 py-2 active:bg-surface-2"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex min-h-14 items-center gap-3 px-4 py-2">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Quiz history</h2>
        {quizHistory.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-5 text-center text-sm text-muted">
            <p>No quizzes yet. Your results will be listed here.</p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/quiz">Take a quiz</Link>
            </Button>
          </Card>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
            {quizHistory.slice(0, 20).map((r) => {
              const percent = r.total ? Math.round((r.score / r.total) * 100) : 0;
              return (
                <li
                  key={r.date}
                  data-testid="quiz-history-row"
                  className="flex min-h-12 items-center gap-3 border-b border-border px-4 py-2 last:border-b-0"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{QUIZ_TITLES[r.type] ?? r.type}</span>
                    <span className="text-xs text-muted">
                      {new Date(r.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                  </span>
                  <span className="font-mono text-sm tabular-nums text-muted">
                    {r.score}/{r.total}
                  </span>
                  <span
                    className={cn(
                      "w-12 text-right font-mono text-sm font-bold tabular-nums",
                      percent >= 80 ? "text-primary" : percent >= 60 ? "text-accent" : "text-danger",
                    )}
                  >
                    {percent}%
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Danger zone</h2>
        <Card className="p-4">
          <p className="text-sm leading-relaxed text-muted">
            Erase every card, streak, score and repertoire change and start again from scratch.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="mt-3 border-danger/40 text-danger" data-testid="reset-progress">
                <Trash2 className="size-4" /> Reset all progress
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Reset all progress?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes your review cards, XP, streak, quiz scores and puzzle results on this device
                {" "}and puts your repertoire back to the starter set. It cannot be undone.
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogAction onClick={resetAll} data-testid="confirm-reset">
                  Yes, delete everything
                </AlertDialogAction>
                <AlertDialogCancel>Keep my progress</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      </section>
    </div>
  );
}
