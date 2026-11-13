"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ChevronRight, Lightbulb, RotateCcw, SkipForward, X } from "lucide-react";
import { BoardLayout } from "@/components/board/board-layout";
import { ChessBoard, type BoardArrow } from "@/components/board/chess-board";
import { TrainerHeader } from "@/components/trainer-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePuzzles } from "@/hooks/use-data";
import {
  formatOpeningTag,
  puzzleFamily,
  puzzleHint,
  puzzleIntro,
  startPuzzle,
  submitPuzzleMove,
  type PuzzleState,
} from "@/lib/puzzle";
import type { MoveInput } from "@/lib/chess-utils";
import { celebrate } from "@/lib/celebrate";
import { playMoveSound, playSound } from "@/lib/sound";
import { useProgress } from "@/store/progress";
import { cn } from "@/lib/utils";
import type { Puzzle } from "@/lib/types";

type MateFilter = 0 | 1 | 2 | 3;

const INTRO_DELAY_MS = 600;
const REPLY_DELAY_MS = 450;

function PuzzlePlayer({ puzzle, onNext, hasNext }: { puzzle: Puzzle; onNext: () => void; hasNext: boolean }) {
  const intro = useMemo(() => puzzleIntro(puzzle), [puzzle]);
  const [state, setState] = useState<PuzzleState | null>(null);
  const [fen, setFen] = useState(intro.fen);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [feedback, setFeedback] = useState<"none" | "wrong" | "good">("none");
  const [busy, setBusy] = useState(false);
  const usedHelp = useRef(false);
  const recordPuzzle = useProgress((s) => s.recordPuzzle);

  // First show the position, then play the opponent's move.
  useEffect(() => {
    const timer = setTimeout(() => {
      playMoveSound(intro.opponentMove);
      const started = startPuzzle(puzzle);
      setState(started);
      setFen(started.fen);
      setLastMove(started.lastMove ?? null);
    }, INTRO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [intro, puzzle]);

  const onMove = useCallback(
    (input: MoveInput) => {
      if (!state || busy) return false;
      const result = submitPuzzleMove(state, input);
      if (result.kind === "wrong") {
        playSound("fail");
        setShakeKey((k) => k + 1);
        setFeedback("wrong");
        setState(result.state);
        return false;
      }
      setHintLevel(0);
      playMoveSound(result.userMove);
      setFen(result.userMove.fen);
      setLastMove({ from: result.userMove.from, to: result.userMove.to });

      if (result.kind === "solved") {
        setState(result.state);
        setFeedback("good");
        const clean = result.state.mistakes === 0 && !usedHelp.current;
        recordPuzzle(puzzle.id, true, clean, puzzle.mateIn);
        playSound("success");
        celebrate();
        return true;
      }

      setFeedback("good");
      setBusy(true);
      setTimeout(() => {
        playMoveSound(result.reply);
        setState(result.state);
        setFen(result.state.fen);
        setLastMove(result.state.lastMove ?? null);
        setFeedback("none");
        setBusy(false);
      }, REPLY_DELAY_MS);
      return true;
    },
    [state, busy, puzzle, recordPuzzle],
  );

  const retry = () => {
    const started = startPuzzle(puzzle);
    usedHelp.current = true;
    setState(started);
    setFen(started.fen);
    setLastMove(started.lastMove ?? null);
    setHintLevel(0);
    setFeedback("none");
    setBusy(false);
  };

  const solved = state?.status === "solved";
  const hint = state ? puzzleHint(state) : undefined;
  const arrows: BoardArrow[] = hint && hintLevel >= 2 ? [{ from: hint.from, to: hint.to, tone: "hint" }] : [];
  const marks = hint && hintLevel === 1 ? { [hint.from]: "hint" as const } : undefined;
  const side = state?.userSide ?? (intro.opponentMove.fen.split(" ")[1] === "w" ? "white" : "black");
  const movesLeft = state ? Math.ceil((puzzle.moves.length - state.index) / 2) : puzzle.mateIn;

  return (
    <BoardLayout
      board={
        <ChessBoard
          fen={fen}
          orientation={side}
          interactive={Boolean(state) && !solved && !busy}
          onMove={onMove}
          lastMove={lastMove}
          arrows={arrows}
          marks={marks}
          shakeKey={shakeKey}
        />
      }
    >
      <Card className="p-4" aria-live="polite">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="danger">Mate in {puzzle.mateIn}</Badge>
          <Badge variant="muted">Rating {puzzle.rating}</Badge>
          {puzzleFamily(puzzle) && <Badge variant="outline">{formatOpeningTag(puzzleFamily(puzzle)!)}</Badge>}
        </div>
        {solved ? (
          <p className="mt-3 flex items-center gap-2 text-lg font-bold text-primary" data-testid="puzzle-solved">
            <Check className="size-6" strokeWidth={3} /> Checkmate!
          </p>
        ) : feedback === "wrong" ? (
          <p className="mt-3 flex items-center gap-2 font-semibold text-danger" data-testid="puzzle-wrong">
            <X className="size-5" strokeWidth={3} /> Not that one — try again.
          </p>
        ) : (
          <p className="mt-3 font-semibold" data-testid="puzzle-prompt">
            {!state
              ? "Watch the opponent's move…"
              : `${side === "white" ? "White" : "Black"} to move. ${
                  movesLeft === 1 ? "Deliver checkmate." : `Mate in ${movesLeft}.`
                }`}
          </p>
        )}
      </Card>

      {solved ? (
        <Button size="lg" onClick={onNext} disabled={!hasNext} data-testid="puzzle-next">
          {hasNext ? "Next puzzle" : "No more puzzles in this filter"} <ChevronRight className="size-5" />
        </Button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="secondary"
            disabled={!state || busy}
            data-testid="puzzle-hint"
            onClick={() => {
              usedHelp.current = true;
              setHintLevel((n) => Math.min(2, n + 1));
            }}
          >
            <Lightbulb className={cn("size-4", hintLevel > 0 && "text-accent")} /> Hint
          </Button>
          <Button variant="secondary" disabled={!state} onClick={retry} data-testid="puzzle-retry">
            <RotateCcw className="size-4" /> Retry
          </Button>
          <Button variant="secondary" onClick={onNext} disabled={!hasNext}>
            <SkipForward className="size-4" /> Skip
          </Button>
        </div>
      )}
      {hintLevel === 1 && !solved && (
        <p className="text-center text-xs text-muted">The highlighted piece is the one to move. Tap Hint again for the arrow.</p>
      )}
    </BoardLayout>
  );
}

function Puzzles() {
  const params = useSearchParams();
  const puzzles = usePuzzles();
  const initialMate = Number(params.get("mate"));
  const [mate, setMate] = useState<MateFilter>(([1, 2, 3].includes(initialMate) ? initialMate : 0) as MateFilter);
  const [opening, setOpening] = useState("");
  const [skipped, setSkipped] = useState<string[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const solved = useProgress((s) => s.puzzles);

  const openings = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of puzzles ?? []) {
      const family = puzzleFamily(p);
      if (family) counts.set(family, (counts.get(family) ?? 0) + 1);
    }
    return [...counts.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]);
  }, [puzzles]);

  const pool = useMemo(
    () =>
      (puzzles ?? []).filter(
        (p) => (mate === 0 || p.mateIn === mate) && (opening === "" || puzzleFamily(p) === opening),
      ),
    [puzzles, mate, opening],
  );

  const pickNext = useCallback(
    (exclude: string[]) => {
      const unsolved = pool.filter((p) => !solved[p.id]?.solved && !exclude.includes(p.id));
      const candidates = unsolved.length > 0 ? unsolved : pool.filter((p) => !exclude.includes(p.id));
      return candidates[0]?.id ?? null;
    },
    [pool, solved],
  );

  // Choose a puzzle when the list loads or the filters change.
  const filterKey = `${mate}|${opening}|${puzzles ? "ready" : "loading"}`;
  const [seenKey, setSeenKey] = useState("");
  if (puzzles && seenKey !== filterKey) {
    setSeenKey(filterKey);
    setSkipped([]);
    setCurrentId(pickNext([]));
  }

  const current = pool.find((p) => p.id === currentId) ?? null;
  const solvedInPool = pool.filter((p) => solved[p.id]?.solved).length;

  const next = () => {
    if (!current) return;
    const exclude = [...skipped, current.id];
    const id = pickNext(exclude);
    if (id) {
      setSkipped(exclude);
      setCurrentId(id);
    } else {
      // Wrapped around: start again from the beginning of this filter.
      setSkipped([]);
      setCurrentId(pickNext([current.id]) ?? current.id);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <TrainerHeader
        title="Mate puzzles"
        subtitle={puzzles ? `${solvedInPool} of ${pool.length} solved` : "Loading puzzles…"}
        progress={pool.length ? solvedInPool / pool.length : 0}
        closeHref="/mates?tab=puzzles"
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="grid grid-cols-4 gap-1 rounded-2xl border border-border bg-surface p-1" role="group" aria-label="Mate in">
          {([0, 1, 2, 3] as const).map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={mate === n}
              data-testid={`mate-filter-${n}`}
              onClick={() => setMate(n)}
              className={cn(
                "h-11 rounded-xl px-3 text-sm font-semibold transition-colors",
                mate === n ? "bg-surface-2 text-foreground shadow-sm" : "text-muted",
              )}
            >
              {n === 0 ? "All" : `Mate in ${n}`}
            </button>
          ))}
        </div>
        <label className="relative flex-1">
          <span className="sr-only">Filter by opening</span>
          <select
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
            data-testid="opening-filter"
            className="h-12 w-full appearance-none rounded-xl border border-border bg-surface px-4 pr-10 font-medium text-foreground"
          >
            <option value="">Any opening</option>
            {openings.map(([tag, count]) => (
              <option key={tag} value={tag}>
                {formatOpeningTag(tag)} ({count})
              </option>
            ))}
          </select>
          <ChevronRight className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 rotate-90 text-muted" />
        </label>
      </div>

      {!puzzles ? (
        <div className="bleed aspect-square animate-pulse bg-surface sm:mx-0 sm:max-w-[560px] sm:rounded-2xl" />
      ) : !current ? (
        <Card className="p-6 text-center text-muted">No puzzles match these filters.</Card>
      ) : (
        <PuzzlePlayer key={current.id} puzzle={current} onNext={next} hasNext={pool.length > 1} />
      )}
    </div>
  );
}

export default function PuzzlesPage() {
  return (
    <Suspense>
      <Puzzles />
    </Suspense>
  );
}
