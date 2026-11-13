"use client";

import Link from "next/link";
import { CalendarCheck, Check, ChevronRight, Dumbbell, GraduationCap, Layers, Repeat } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRepertoire } from "@/hooks/use-data";
import { useTraining } from "@/hooks/use-training";
import { getCuratedOpenings } from "@/lib/curated";
import { useProgress } from "@/store/progress";
import { daysUntilDue } from "@/lib/srs";

function ModeHeader({
  icon: Icon,
  title,
  text,
  tone,
}: {
  icon: typeof Repeat;
  title: string;
  text: string;
  tone: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <h2 className="text-lg font-bold leading-tight">{title}</h2>
        <p className="mt-0.5 text-sm leading-relaxed text-muted">{text}</p>
      </div>
    </div>
  );
}

export default function TrainPage() {
  const training = useTraining();
  const { entries } = useRepertoire();
  const cards = useProgress((s) => s.cards);
  const learnedLines = useProgress((s) => s.learnedLines);

  const due = training.due.length;
  const nextLine = training.unlearned[0];
  const upcoming = training.deck
    .map((c) => cards[c.key])
    .filter(Boolean)
    .map((c) => daysUntilDue(c.srs))
    .filter((d) => d > 0);
  const nextDueIn = upcoming.length ? Math.min(...upcoming) : null;

  const inRepertoire = new Set(entries.map((e) => e.id));
  const otherCurated = getCuratedOpenings().filter((o) => !inRepertoire.has(o.id));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Train"
        subtitle="Memorise your openings move by move"
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/repertoire">
              <Layers className="size-4" /> Repertoire
            </Link>
          </Button>
        }
      />

      <Card className="card-gradient p-4">
        <ModeHeader
          icon={Repeat}
          title="Review"
          text="Positions that are due today. The app brings each one back just before you would forget it."
          tone="bg-primary/15 text-primary"
        />
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm">
            <span className="text-3xl font-bold tabular-nums">{due}</span>{" "}
            <span className="text-muted">due today</span>
          </p>
          {due > 0 ? (
            <Button asChild>
              <Link href="/train/session?mode=review" data-testid="start-review">
                Start review <ChevronRight className="size-5" />
              </Link>
            </Button>
          ) : (
            <Badge variant="muted" className="h-9 px-3">
              <CalendarCheck className="size-4" />
              {nextDueIn === null
                ? "Learn a line first"
                : `Next review in ${nextDueIn} day${nextDueIn === 1 ? "" : "s"}`}
            </Badge>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <ModeHeader
          icon={GraduationCap}
          title="Learn"
          text="Play through a new line with hints. Every move you make becomes a review card."
          tone="bg-info/15 text-info"
        />
        {nextLine && (
          <Button asChild className="mt-4 w-full justify-between">
            <Link href={`/train/session?mode=learn&line=${encodeURIComponent(nextLine.id)}`} data-testid="learn-next">
              <span className="truncate">
                Next: {nextLine.openingName} — {nextLine.isMain ? "Main line" : nextLine.name}
              </span>
              <ChevronRight className="size-5 shrink-0" />
            </Link>
          </Button>
        )}
        <div className="mt-4 flex flex-col gap-4">
          {entries.length === 0 && (
            <div className="flex flex-col items-start gap-2 text-sm text-muted">
              <p>Your repertoire is empty. Add an opening to start learning.</p>
              <Button asChild variant="secondary" size="sm">
                <Link href="/repertoire">Add an opening</Link>
              </Button>
            </div>
          )}
          {entries.map((entry) => (
            <div key={entry.id}>
              <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <span
                  className={`size-3 rounded-full border border-border ${
                    entry.side === "white" ? "bg-white" : "bg-neutral-900"
                  }`}
                />
                {entry.name}
              </p>
              <ul className="overflow-hidden rounded-xl border border-border">
                {entry.lines.map((line) => {
                  const done = Boolean(learnedLines[line.id]);
                  return (
                    <li key={line.id} className="border-b border-border last:border-b-0">
                      <Link
                        href={`/train/session?mode=learn&line=${encodeURIComponent(line.id)}`}
                        className="flex min-h-12 items-center gap-3 px-3 py-2 active:bg-surface-2"
                      >
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                            done ? "bg-primary text-primary-foreground" : "border border-border"
                          }`}
                        >
                          {done && <Check className="size-4" strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[15px]">
                          {line.isMain ? "Main line" : line.name}
                        </span>
                        <span className="text-xs text-muted">{Math.ceil(line.sans.length / 2)} moves</span>
                        <ChevronRight className="size-4 shrink-0 text-muted" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <ModeHeader
          icon={Dumbbell}
          title="Drill"
          text="Random positions from one opening. Great for a quick warm-up — it does not change your review schedule."
          tone="bg-accent/15 text-accent"
        />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {entries.map((entry) => (
            <Button key={entry.id} asChild variant="secondary" className="justify-between">
              <Link href={`/train/session?mode=drill&opening=${encodeURIComponent(entry.id)}`} data-testid="drill-link">
                <span className="truncate">{entry.name}</span>
                <ChevronRight className="size-4 shrink-0" />
              </Link>
            </Button>
          ))}
        </div>
        {otherCurated.length > 0 && (
          <details className="mt-3">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-muted">
              Drill another opening
            </summary>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {otherCurated.map((o) => (
                <Button key={o.id} asChild variant="outline" className="justify-between">
                  <Link href={`/train/session?mode=drill&opening=${o.id}`}>
                    <span className="truncate">{o.name}</span>
                    <ChevronRight className="size-4 shrink-0" />
                  </Link>
                </Button>
              ))}
            </div>
          </details>
        )}
      </Card>
    </div>
  );
}
