"use client";

import Link from "next/link";
import { ChevronRight, Crosshair, HelpCircle, Scale, Tag, Timer, Trophy } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  PRACTICE_QUESTION_COUNT,
  QUIZ_TITLES,
  QUIZ_TYPES,
  TEST_QUESTION_COUNT,
  TEST_SECONDS_PER_QUESTION,
  type QuizType,
} from "@/lib/quiz";
import { useProgress } from "@/store/progress";

const ICONS: Record<QuizType, typeof Tag> = {
  name: Tag,
  "next-move": HelpCircle,
  trap: Crosshair,
  side: Scale,
};

export default function QuizPage() {
  const bestScores = useProgress((s) => s.bestScores);
  const history = useProgress((s) => s.quizHistory);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Quiz" subtitle="Check what has really stuck" />

      <Card className="card-gradient p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <Timer className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold leading-tight">Timed test</h2>
            <p className="mt-0.5 text-sm leading-relaxed text-muted">
              {TEST_QUESTION_COUNT} mixed questions, {TEST_SECONDS_PER_QUESTION} seconds each. You get a score and a
              review of everything you missed.
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          {bestScores.test !== undefined ? (
            <Badge variant="accent" className="h-8 px-3">
              <Trophy className="size-4" /> Best {bestScores.test}%
            </Badge>
          ) : (
            <span className="text-sm text-muted">No score yet</span>
          )}
          <Button asChild>
            <Link href="/quiz/play?type=test" data-testid="start-test">
              Start test <ChevronRight className="size-5" />
            </Link>
          </Button>
        </div>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          Practice · {PRACTICE_QUESTION_COUNT} questions, no clock
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {QUIZ_TYPES.map(({ type, title, description }) => {
            const Icon = ICONS[type];
            const best = bestScores[type];
            return (
              <Link key={type} href={`/quiz/play?type=${type}`} data-testid={`quiz-${type}`}>
                <Card className="flex h-full items-center gap-3 p-4 active:bg-surface-2">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{title}</p>
                    <p className="mt-0.5 text-sm text-muted">{description}</p>
                    {best !== undefined && (
                      <p className="mt-1 text-xs font-semibold text-accent">Best {best}%</p>
                    )}
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted" />
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Recent results</h2>
          <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
            {history.slice(0, 5).map((r) => (
              <li key={r.date} className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 py-2 last:border-b-0">
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">{QUIZ_TITLES[r.type] ?? r.type}</span>
                  <span className="text-xs text-muted">
                    {new Date(r.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </span>
                </span>
                <span className="font-mono text-sm font-bold tabular-nums">
                  {r.score}/{r.total}
                </span>
              </li>
            ))}
          </ul>
          <Button asChild variant="link" className="h-11 px-0">
            <Link href="/progress">See all quiz history</Link>
          </Button>
        </section>
      )}
    </div>
  );
}
