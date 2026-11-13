"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Play } from "lucide-react";
import { BoardLayout } from "@/components/board/board-layout";
import { BoardNav } from "@/components/board/board-nav";
import { ChessBoard, type BoardArrow } from "@/components/board/chess-board";
import { MoveList } from "@/components/board/move-list";
import { PageHeader } from "@/components/page-header";
import { SwipeArea } from "@/components/swipe-area";
import { LearnSession } from "@/components/trainer/learn-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLineViewer } from "@/hooks/use-line-viewer";
import { getPattern, getPatterns } from "@/lib/curated";
import { sideToMove } from "@/lib/chess-utils";
import type { TrainLine } from "@/lib/training/engine";
import { useProgress } from "@/store/progress";
import type { MatePattern } from "@/lib/types";

function PatternLesson({ pattern, onTry }: { pattern: MatePattern; onTry: () => void }) {
  const sans = useMemo(() => pattern.lesson.moves.map(([san]) => san), [pattern]);
  const viewer = useLineViewer(sans, pattern.lesson.fen);
  const { ply, setPly } = viewer;
  const side = sideToMove(pattern.lesson.fen);
  const startPly = side === "white" ? 0 : 1;

  const arrows: BoardArrow[] = viewer.next ? [{ from: viewer.next.from, to: viewer.next.to, tone: "hint" }] : [];

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title={pattern.name} subtitle="Mating pattern" back="/mates?tab=patterns" />
      <BoardLayout
        board={
          <SwipeArea onSwipeLeft={() => setPly(ply + 1)} onSwipeRight={() => setPly(ply - 1)}>
            <ChessBoard fen={viewer.fen} orientation={side} lastMove={viewer.last} arrows={arrows} />
          </SwipeArea>
        }
      >
        <MoveList sans={sans} ply={ply} onSelect={setPly} startPly={startPly} />
        <BoardNav ply={ply} total={viewer.total} onChange={setPly} />

        <Card className="min-h-[96px] p-4" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div
              key={ply}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {ply === 0 ? (
                <>
                  <p className="text-[15px] leading-relaxed">{pattern.summary}</p>
                  <p className="mt-2 text-xs text-muted">Tap Next to see how it works.</p>
                </>
              ) : (
                <>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-base font-bold">{sans[ply - 1]}</span>
                    {ply === sans.length && <Badge variant="danger">Checkmate</Badge>}
                  </div>
                  <p className="text-[15px] leading-relaxed" data-testid="explanation">
                    {pattern.lesson.moves[ply - 1][1]}
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </Card>

        <Card className="p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Eye className="size-5 text-info" /> What to look for
          </h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {pattern.recognise.map((item) => (
              <li key={item} className="flex gap-3 text-[15px] leading-relaxed">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Button size="lg" onClick={onTry} data-testid="try-it">
          <Play className="size-5" /> Try it yourself
        </Button>
      </BoardLayout>
    </div>
  );
}

function PatternPage() {
  const params = useSearchParams();
  const pattern = getPattern(params.get("id") ?? "");
  const [exercise, setExercise] = useState<number | null>(null);
  const markPatternDone = useProgress((s) => s.markPatternDone);

  if (!pattern) {
    return (
      <div className="flex flex-col gap-3">
        <PageHeader title="Pattern not found" back="/mates?tab=patterns" />
        <Button asChild>
          <Link href="/mates?tab=patterns">Back to patterns</Link>
        </Button>
      </div>
    );
  }

  if (exercise === null) return <PatternLesson pattern={pattern} onTry={() => setExercise(0)} />;

  const current = pattern.exercises[exercise];
  const isLast = exercise === pattern.exercises.length - 1;
  const all = getPatterns();
  const nextPattern = all[(all.findIndex((p) => p.id === pattern.id) + 1) % all.length];
  const line: TrainLine = {
    id: `pattern:${pattern.id}:${exercise}`,
    openingId: `pattern:${pattern.id}`,
    openingName: pattern.name,
    name: `Exercise ${exercise + 1} of ${pattern.exercises.length}`,
    side: sideToMove(current.fen),
    sans: current.moves,
    notes: current.moves.map(() => ""),
    startFen: current.fen,
  };

  return (
    <div className="flex flex-col gap-3">
      <LearnSession
        key={line.id}
        line={line}
        hints={false}
        schedule={false}
        acceptAnyMate
        closeHref="/mates?tab=patterns"
        title={pattern.name}
        doneLabel="Back to patterns"
        nextHref={isLast ? `/mates/pattern?id=${nextPattern.id}` : undefined}
        nextLabel={isLast ? `Next pattern: ${nextPattern.name}` : undefined}
        onComplete={() => {
          if (isLast) markPatternDone(pattern.id);
        }}
      />
      <Card className="p-4">
        <p className="text-[15px] font-semibold leading-relaxed" data-testid="exercise-prompt">
          {current.prompt}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {!isLast && (
            <Button size="sm" onClick={() => setExercise(exercise + 1)} data-testid="next-exercise">
              Next exercise
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => setExercise(null)}>
            Back to the lesson
          </Button>
        </div>
      </Card>
    </div>
  );
}

/** Remounts when the id changes so "Next pattern" starts with the lesson. */
function PatternPageKeyed() {
  const params = useSearchParams();
  return <PatternPage key={params.get("id")} />;
}

export default function Page() {
  return (
    <Suspense>
      <PatternPageKeyed />
    </Suspense>
  );
}
