"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronRight, Puzzle, Skull, Sparkles } from "lucide-react";
import { MiniBoard } from "@/components/board/mini-board";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePuzzles } from "@/hooks/use-data";
import { getPatterns, getTraps } from "@/lib/curated";
import { replaySan } from "@/lib/chess-utils";
import { useProgress } from "@/store/progress";

const TABS = ["traps", "patterns", "puzzles"] as const;

function TrapsTab() {
  const done = useProgress((s) => s.trapsDone);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {getTraps().map((trap) => {
        const moves = replaySan(trap.moves.map(([san]) => san));
        return (
          <Link key={trap.id} href={`/mates/trap?id=${trap.id}`} data-testid="trap-link">
            <Card className="flex h-full items-center gap-3 p-3 active:bg-surface-2">
              <MiniBoard fen={moves[moves.length - 1].after} orientation={trap.winner} className="w-20 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight">{trap.name}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge variant={trap.mate ? "danger" : "accent"}>
                    {trap.mate ? `Mate in ${Math.ceil(moves.length / 2)}` : "Wins material"}
                  </Badge>
                  <Badge variant="muted">{trap.winner === "white" ? "White wins" : "Black wins"}</Badge>
                  {done[trap.id] && (
                    <Badge>
                      <Check className="size-3" /> Done
                    </Badge>
                  )}
                </div>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted" />
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function PatternsTab() {
  const done = useProgress((s) => s.patternsDone);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {getPatterns().map((pattern) => {
        const moves = replaySan(pattern.lesson.moves.map(([san]) => san), pattern.lesson.fen);
        return (
          <Link key={pattern.id} href={`/mates/pattern?id=${pattern.id}`} data-testid="pattern-link">
            <Card className="flex h-full items-center gap-3 p-3 active:bg-surface-2">
              <MiniBoard fen={moves[moves.length - 1].after} className="w-20 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight">{pattern.name}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{pattern.summary}</p>
                {done[pattern.id] && (
                  <Badge className="mt-1.5">
                    <Check className="size-3" /> Done
                  </Badge>
                )}
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted" />
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function PuzzlesTab() {
  const puzzles = usePuzzles();
  const solved = useProgress((s) => s.puzzles);
  const solvedCount = Object.values(solved).filter((p) => p.solved).length;

  return (
    <div className="flex flex-col gap-3">
      <Card className="card-gradient p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Puzzle className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">Checkmate puzzles</h2>
            <p className="mt-0.5 text-sm leading-relaxed text-muted">
              {puzzles ? puzzles.length.toLocaleString() : "1,500"} real-game positions from Lichess, rated 600–1500.
              Find the mate.
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">
          <span className="text-2xl font-bold tabular-nums text-foreground">{solvedCount}</span> solved
        </p>
        <Button asChild className="mt-3 w-full">
          <Link href="/mates/puzzles" data-testid="start-puzzles">
            Start solving <ChevronRight className="size-5" />
          </Link>
        </Button>
      </Card>
      <div className="grid grid-cols-3 gap-3">
        {([1, 2, 3] as const).map((n) => {
          const total = puzzles?.filter((p) => p.mateIn === n) ?? [];
          const done = total.filter((p) => solved[p.id]?.solved).length;
          return (
            <Link key={n} href={`/mates/puzzles?mate=${n}`}>
              <Card className="p-3 text-center active:bg-surface-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Mate in</p>
                <p className="text-3xl font-bold">{n}</p>
                <p className="text-xs tabular-nums text-muted">
                  {done}/{total.length || 500}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Mates() {
  const params = useSearchParams();
  const router = useRouter();
  const requested = params.get("tab");
  const tab = TABS.includes(requested as (typeof TABS)[number]) ? (requested as string) : "traps";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Checkmates" subtitle="Quick wins, patterns and puzzles" />
      <Tabs value={tab} onValueChange={(value) => router.replace(`/mates?tab=${value}`, { scroll: false })}>
        <TabsList>
          <TabsTrigger value="traps">
            <Skull className="size-4" /> Traps
          </TabsTrigger>
          <TabsTrigger value="patterns">
            <Sparkles className="size-4" /> Patterns
          </TabsTrigger>
          <TabsTrigger value="puzzles">
            <Puzzle className="size-4" /> Puzzles
          </TabsTrigger>
        </TabsList>
        <TabsContent value="traps">
          <TrapsTab />
        </TabsContent>
        <TabsContent value="patterns">
          <PatternsTab />
        </TabsContent>
        <TabsContent value="puzzles">
          <PuzzlesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MatesPage() {
  return (
    <Suspense>
      <Mates />
    </Suspense>
  );
}
