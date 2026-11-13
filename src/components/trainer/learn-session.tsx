"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Lightbulb, LightbulbOff, RotateCcw, Trophy } from "lucide-react";
import { BoardLayout } from "@/components/board/board-layout";
import { ChessBoard, type BoardArrow } from "@/components/board/chess-board";
import { MoveList } from "@/components/board/move-list";
import { TrainerHeader } from "@/components/trainer-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  runAdvanceOpponent,
  runExpected,
  runFen,
  runResults,
  runStatus,
  runSubmit,
  startRun,
  type LineRun,
  type TrainLine,
} from "@/lib/training/engine";
import { tryMove, type MoveInput } from "@/lib/chess-utils";
import { celebrate, celebrateBig } from "@/lib/celebrate";
import { playMoveSound, playSound } from "@/lib/sound";
import { useProgress } from "@/store/progress";

interface LearnSessionProps {
  line: TrainLine;
  /** Shown as "next" on the summary screen. */
  nextHref?: string;
  nextLabel?: string;
  /** Learn mode shows hints; "Play it yourself" tests start without them. */
  hints?: boolean;
  /** When false the result is not saved as review cards (used by trap and pattern tests). */
  schedule?: boolean;
  /** Accept any move that gives checkmate, even if it is not the listed one. */
  acceptAnyMate?: boolean;
  closeHref: string;
  title?: string;
  doneLabel?: string;
  onComplete?: (mistakes: number) => void;
}

const OPPONENT_DELAY_MS = 550;

export function LearnSession({
  line,
  nextHref,
  nextLabel,
  hints: hintsDefault = true,
  schedule = true,
  acceptAnyMate = false,
  closeHref,
  title,
  doneLabel = "Done",
  onComplete,
}: LearnSessionProps) {
  const [run, setRun] = useState<LineRun>(() => startRun(line));
  const [hints, setHints] = useState(hintsDefault);
  const [shakeKey, setShakeKey] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [done, setDone] = useState(false);
  /** Set when you finished with a different (also mating) move. */
  const [altFinish, setAltFinish] = useState<{ fen: string; from: string; to: string; san: string } | null>(null);
  const finished = useRef(false);

  const gradeCard = useProgress((s) => s.gradeCard);
  const markLineLearned = useProgress((s) => s.markLineLearned);

  const status = runStatus(run);
  const expected = runExpected(run);
  const lastMove = run.ply > 0 ? run.moves[run.ply - 1] : null;

  const finish = useCallback(
    (final: LineRun) => {
      if (finished.current) return;
      finished.current = true;
      if (schedule) {
        for (const { card, grade } of runResults(final)) gradeCard(card, grade);
        markLineLearned(final.line.id);
      }
      onComplete?.(final.mistakes.length);
      playSound("success");
      if (final.mistakes.length === 0) celebrateBig();
      else celebrate();
      setDone(true);
    },
    [gradeCard, markLineLearned, onComplete, schedule],
  );

  // The opponent's moves are played automatically after a short pause.
  useEffect(() => {
    if (status !== "opponent") return;
    const timer = setTimeout(() => {
      const move = runExpected(run);
      const next = runAdvanceOpponent(run);
      if (move) playMoveSound(move);
      setRun(next);
      if (runStatus(next) === "done") finish(next);
    }, OPPONENT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [run, status, finish]);

  const onMove = useCallback(
    (input: MoveInput) => {
      const result = runSubmit(run, input);
      if (!result.correct) {
        // A different checkmate is just as good as the one in the book.
        const other = acceptAnyMate ? tryMove(runFen(run), { ...input, promotion: input.promotion ?? "q" }) : null;
        if (other && other.san.endsWith("#")) {
          playMoveSound(other);
          setAltFinish({ fen: other.after, from: other.from, to: other.to, san: other.san });
          setShowAnswer(false);
          finish(run);
          return true;
        }
        playSound("fail");
        setShakeKey((k) => k + 1);
        setShowAnswer(true);
        setRun(result.run);
        return false;
      }
      playMoveSound(run.moves[run.ply]);
      setShowAnswer(false);
      setRun(result.run);
      if (runStatus(result.run) === "done") finish(result.run);
      return true;
    },
    [run, finish, acceptAnyMate],
  );

  const restart = () => {
    finished.current = false;
    setRun(startRun(line));
    setShowAnswer(false);
    setAltFinish(null);
    setDone(false);
  };

  const arrows: BoardArrow[] =
    !done && status === "user" && expected && (showAnswer || hints)
      ? [{ from: expected.from, to: expected.to, tone: showAnswer ? "good" : "hint" }]
      : [];

  const sideName = line.side === "white" ? "White" : "Black";
  const isUserMove = (color: "w" | "b") => (color === "w") === (line.side === "white");
  const userMoves = run.moves.filter((m) => isUserMove(m.color)).length;
  const mistakes = run.mistakes.length;

  return (
    <div className="flex flex-col">
      <TrainerHeader
        title={title ?? line.openingName}
        subtitle={`${line.name} · you are ${sideName}`}
        progress={done ? 1 : run.moves.length ? run.ply / run.moves.length : 0}
        closeHref={closeHref}
        actions={
          <Button
            variant="ghost"
            size="icon"
            aria-label={hints ? "Turn hints off" : "Turn hints on"}
            aria-pressed={hints}
            onClick={() => setHints((h) => !h)}
          >
            {hints ? <Lightbulb className="size-5 text-accent" /> : <LightbulbOff className="size-5 text-muted" />}
          </Button>
        }
      />

      <BoardLayout
        board={
          <ChessBoard
            fen={altFinish?.fen ?? runFen(run)}
            orientation={line.side}
            interactive={status === "user" && !done}
            onMove={onMove}
            lastMove={altFinish ?? lastMove}
            arrows={arrows}
            shakeKey={shakeKey}
          />
        }
      >
        {!line.startFen && <MoveList sans={line.sans.slice(0, run.ply)} ply={run.ply} />}

        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="card-gradient p-5 text-center" data-testid="line-complete">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                  <Trophy className="size-7" />
                </div>
                <h2 className="mt-3 text-xl font-bold">{mistakes === 0 ? "Perfect!" : "Line complete"}</h2>
                <p className="mt-1 text-sm text-muted">
                  {altFinish
                    ? `${altFinish.san} is checkmate too. Well spotted!`
                    : mistakes === 0
                      ? `You played all ${userMoves} move${userMoves === 1 ? "" : "s"} correctly.`
                      : `${userMoves - mistakes} of ${userMoves} moves right first time.${
                          schedule ? " The ones you missed will come back for review sooner." : ""
                        }`}
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  {nextHref && (
                    <Button asChild>
                      <Link href={nextHref}>
                        <span className="truncate">{nextLabel ?? "Next line"}</span>
                        <ChevronRight className="size-5 shrink-0" />
                      </Link>
                    </Button>
                  )}
                  <Button variant="secondary" onClick={restart}>
                    <RotateCcw className="size-4" /> Practise again
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={closeHref}>{doneLabel}</Link>
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key={`ply-${run.ply}-${showAnswer}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="min-h-[128px] p-4" aria-live="polite">
                {lastMove && (
                  <div className="mb-3 border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold">{lastMove.san}</span>
                      <Badge variant={isUserMove(lastMove.color) ? "default" : "muted"}>
                        {isUserMove(lastMove.color) ? (
                          <>
                            <Check className="size-3" /> Correct
                          </>
                        ) : (
                          "Opponent"
                        )}
                      </Badge>
                    </div>
                    {line.notes[run.ply - 1] && (
                      <p className="mt-1 text-sm leading-relaxed text-muted">{line.notes[run.ply - 1]}</p>
                    )}
                  </div>
                )}
                {status === "user" && expected && (
                  <div data-testid="prompt">
                    {showAnswer ? (
                      <>
                        <p className="font-semibold text-danger">Not quite — the move is {expected.san}.</p>
                        {line.notes[run.ply] && <p className="mt-1 text-sm leading-relaxed">{line.notes[run.ply]}</p>}
                        <p className="mt-1 text-xs text-muted">Follow the green arrow to continue.</p>
                      </>
                    ) : hints ? (
                      <>
                        <p className="font-semibold">
                          Your move: play <span className="font-mono text-primary">{expected.san}</span>
                        </p>
                        {line.notes[run.ply] && (
                          <p className="mt-1 text-sm leading-relaxed text-muted">{line.notes[run.ply]}</p>
                        )}
                      </>
                    ) : (
                      <p className="font-semibold">Your move as {sideName}. What do you play?</p>
                    )}
                  </div>
                )}
                {status === "opponent" && <p className="text-sm text-muted">Opponent is moving…</p>}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </BoardLayout>
    </div>
  );
}
