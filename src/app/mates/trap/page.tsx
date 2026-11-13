"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Play, RefreshCcw, Shield, Swords } from "lucide-react";
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
import { getTrap, getTraps } from "@/lib/curated";
import { trySan } from "@/lib/chess-utils";
import type { TrainLine } from "@/lib/training/engine";
import { useProgress } from "@/store/progress";
import type { Side, Trap } from "@/lib/types";

function moveLabel(ply: number, san: string) {
  return `${Math.floor((ply - 1) / 2) + 1}${ply % 2 === 1 ? "." : "…"}${san}`;
}

function TrapLesson({ trap, onTest }: { trap: Trap; onTest: () => void }) {
  const sans = useMemo(() => trap.moves.map(([san]) => san), [trap]);
  const viewer = useLineViewer(sans);
  const { ply, setPly } = viewer;
  const [orientation, setOrientation] = useState<Side>(trap.winner);
  const [showDefence, setShowDefence] = useState(false);

  const defence = useMemo(() => {
    const played = viewer.moves[trap.defend.atPly];
    const better = trySan(played.before, trap.defend.better);
    return { before: played.before, played, better: better ?? played };
  }, [trap, viewer.moves]);

  const loser = trap.winner === "white" ? "Black" : "White";
  const isBlunder = ply - 1 === trap.blunderPly;
  const isKey = ply - 1 === trap.keyPly;

  const arrows: BoardArrow[] = showDefence
    ? [
        { from: defence.better.from, to: defence.better.to, tone: "good" },
        { from: defence.played.from, to: defence.played.to, tone: "bad" },
      ]
    : viewer.next
      ? [{ from: viewer.next.from, to: viewer.next.to, tone: "hint" }]
      : [];

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        title={trap.name}
        subtitle={`${trap.winner === "white" ? "White" : "Black"} wins${trap.mate ? " by checkmate" : " material"}`}
        back="/mates?tab=traps"
        actions={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Flip board"
            onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
          >
            <RefreshCcw className="size-5" />
          </Button>
        }
      />
      <BoardLayout
        board={
          <SwipeArea
            onSwipeLeft={() => {
              setShowDefence(false);
              setPly(ply + 1);
            }}
            onSwipeRight={() => {
              setShowDefence(false);
              setPly(ply - 1);
            }}
          >
            <ChessBoard
              fen={showDefence ? defence.before : viewer.fen}
              orientation={orientation}
              lastMove={showDefence ? null : viewer.last}
              arrows={arrows}
            />
          </SwipeArea>
        }
      >
        <MoveList
          sans={sans}
          ply={showDefence ? trap.defend.atPly : ply}
          onSelect={(p) => {
            setShowDefence(false);
            setPly(p);
          }}
        />
        <BoardNav
          ply={ply}
          total={viewer.total}
          onChange={(p) => {
            setShowDefence(false);
            setPly(p);
          }}
        />

        <Card className="min-h-[104px] p-4" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div
              key={showDefence ? "defence" : ply}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {showDefence ? (
                <>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-primary">
                      {moveLabel(trap.defend.atPly + 1, trap.defend.better)}
                    </span>
                    <Badge>Better move</Badge>
                  </div>
                  <p className="text-[15px] leading-relaxed">{trap.defend.why}</p>
                </>
              ) : ply === 0 ? (
                <>
                  <p className="text-[15px] leading-relaxed">{trap.summary}</p>
                  <p className="mt-2 text-xs text-muted">Tap Next or swipe the board to step through.</p>
                </>
              ) : (
                <>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-base font-bold">{moveLabel(ply, sans[ply - 1])}</span>
                    {isBlunder && <Badge variant="danger">The mistake</Badge>}
                    {isKey && <Badge variant="accent">The punishment</Badge>}
                  </div>
                  <p className="text-[15px] leading-relaxed" data-testid="explanation">
                    {trap.moves[ply - 1][1]}
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </Card>

        <Card className="p-4" data-testid="how-to-defend">
          <h2 className="flex items-center gap-2 font-semibold">
            <Shield className="size-5 text-info" /> How to defend
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{trap.defend.text}</p>
          <Button
            variant={showDefence ? "secondary" : "outline"}
            size="sm"
            className="mt-3"
            onClick={() => setShowDefence((v) => !v)}
          >
            {showDefence
              ? "Back to the trap"
              : `Show what ${loser} should play: ${moveLabel(trap.defend.atPly + 1, trap.defend.better)}`}
          </Button>
        </Card>

        <Button size="lg" onClick={onTest} data-testid="play-it-yourself">
          <Play className="size-5" /> Play it yourself
        </Button>
      </BoardLayout>
    </div>
  );
}

function TrapPage() {
  const params = useSearchParams();
  const trap = getTrap(params.get("id") ?? "");
  const [testing, setTesting] = useState(false);
  const markTrapDone = useProgress((s) => s.markTrapDone);

  const line = useMemo<TrainLine | null>(() => {
    if (!trap) return null;
    return {
      id: `trap:${trap.id}`,
      openingId: `trap:${trap.id}`,
      openingName: trap.name,
      name: "Play it yourself",
      side: trap.winner,
      sans: trap.moves.map(([san]) => san),
      notes: trap.moves.map(([, why]) => why),
    };
  }, [trap]);

  if (!trap || !line) {
    return (
      <div className="flex flex-col gap-3">
        <PageHeader title="Trap not found" back="/mates?tab=traps" />
        <Button asChild>
          <Link href="/mates?tab=traps">Back to traps</Link>
        </Button>
      </div>
    );
  }

  if (testing) {
    const all = getTraps();
    const next = all[(all.findIndex((t) => t.id === trap.id) + 1) % all.length];
    return (
      <div>
        <LearnSession
          line={line}
          hints={false}
          schedule={false}
          acceptAnyMate={trap.mate}
          closeHref="/mates?tab=traps"
          title={trap.name}
          doneLabel="Back to traps"
          nextHref={`/mates/trap?id=${next.id}`}
          nextLabel={`Next trap: ${next.name}`}
          onComplete={() => markTrapDone(trap.id)}
        />
        <Button variant="ghost" className="mt-2 w-full text-muted" onClick={() => setTesting(false)}>
          <Swords className="size-4" /> Back to the lesson <ChevronRight className="size-4" />
        </Button>
      </div>
    );
  }

  return <TrapLesson trap={trap} onTest={() => setTesting(true)} />;
}

export default function Page() {
  return (
    <Suspense>
      <TrapPageKeyed />
    </Suspense>
  );
}

/** Remounts when the id changes so "Next trap" starts fresh. */
function TrapPageKeyed() {
  const params = useSearchParams();
  return <TrapPage key={params.get("id")} />;
}
