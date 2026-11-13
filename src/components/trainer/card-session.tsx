"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Eye, RotateCcw, Trophy, X } from "lucide-react";
import { BoardLayout } from "@/components/board/board-layout";
import { ChessBoard, type BoardArrow } from "@/components/board/chess-board";
import { TrainerHeader } from "@/components/trainer-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  createSession,
  currentCard,
  sessionAnswer,
  sessionDone,
  sessionSummary,
  type CardSession,
  type TrainCard,
} from "@/lib/training/engine";
import { tryMove, type MoveInput } from "@/lib/chess-utils";
import { celebrate, celebrateBig } from "@/lib/celebrate";
import { playMoveSound, playSound } from "@/lib/sound";
import { useProgress } from "@/store/progress";

interface CardSessionViewProps {
  cards: TrainCard[];
  title: string;
  /** Review reschedules cards with FSRS; Drill only records accuracy. */
  schedule: boolean;
  closeHref: string;
}

type Phase = "lead" | "answer" | "correct";

const LEAD_DELAY_MS = 450;
const NEXT_DELAY_MS = 750;

export function CardSessionView({ cards, title, schedule, closeHref }: CardSessionViewProps) {
  const [session, setSession] = useState<CardSession>(() => createSession(cards));
  const [phase, setPhase] = useState<Phase>("lead");
  const [fen, setFen] = useState<string>(() => cards[0]?.lead?.fen ?? cards[0]?.fen ?? "");
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const celebrated = useRef(false);

  const gradeCard = useProgress((s) => s.gradeCard);
  const card = currentCard(session);
  const done = sessionDone(session);

  // Show the opponent's last move first, so you see how the position came about.
  useEffect(() => {
    if (!card || phase !== "lead") return;
    const lead = card.lead;
    const timer = setTimeout(
      () => {
        if (lead) {
          const played = tryMove(lead.fen, { from: lead.from, to: lead.to });
          if (played) playMoveSound(played);
          setFen(card.fen);
          setLastMove({ from: lead.from, to: lead.to });
        }
        setPhase("answer");
      },
      lead ? LEAD_DELAY_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [card, phase]);

  useEffect(() => {
    if (!done || celebrated.current || cards.length === 0) return;
    celebrated.current = true;
    playSound("success");
    if (sessionSummary(session).again === 0) celebrateBig();
    else celebrate();
  }, [done, session, cards.length]);

  const goToNext = useCallback((next: CardSession) => {
    const upcoming = currentCard(next);
    setSession(next);
    setShowAnswer(false);
    setLastMove(null);
    if (upcoming) {
      setFen(upcoming.lead?.fen ?? upcoming.fen);
      setPhase("lead");
    }
  }, []);

  const submit = useCallback(
    (input: MoveInput | null) => {
      if (!card || phase !== "answer") return false;
      const firstResult = !(card.key in session.results);
      // null = "Show me the answer", which counts as a miss.
      const result = sessionAnswer(session, input ?? { from: "", to: "" });

      if (firstResult) gradeCard(card, result.correct ? "good" : "again", { schedule });

      if (!result.correct) {
        if (input) {
          playSound("fail");
          setShakeKey((k) => k + 1);
        }
        setShowAnswer(true);
        setSession(result.session);
        return false;
      }

      const played = tryMove(card.fen, { from: card.from, to: card.to, promotion: card.promotion });
      if (played) {
        playMoveSound(played);
        setFen(played.after);
      }
      setLastMove({ from: card.from, to: card.to });
      setPhase("correct");
      setShowAnswer(false);
      setTimeout(() => goToNext(result.session), NEXT_DELAY_MS);
      return true;
    },
    [card, phase, session, gradeCard, schedule, goToNext],
  );

  if (cards.length === 0) {
    return (
      <div className="flex flex-col">
        <TrainerHeader title={title} closeHref={closeHref} />
        <Card className="mx-auto mt-6 w-full max-w-md p-6 text-center" data-testid="session-empty">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <Check className="size-7" />
          </div>
          <h2 className="mt-3 text-xl font-bold">All caught up</h2>
          <p className="mt-1 text-sm text-muted">Nothing to review right now. Learn a new line or try a drill.</p>
          <Button asChild className="mt-5 w-full">
            <Link href="/train">Back to training</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (done) {
    const summary = sessionSummary(session);
    const missed = cards.filter((c) => session.results[c.key] === "again");
    return (
      <div className="flex flex-col">
        <TrainerHeader title={title} closeHref={closeHref} progress={1} />
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto mt-4 w-full max-w-md"
        >
          <Card className="card-gradient p-6 text-center" data-testid="session-complete">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <Trophy className="size-7" />
            </div>
            <h2 className="mt-3 text-xl font-bold">{summary.again === 0 ? "Flawless!" : "Session complete"}</h2>
            <p className="mt-4 text-5xl font-bold tabular-nums">{summary.accuracy}%</p>
            <p className="mt-1 text-sm text-muted">
              {summary.good} of {summary.total} right first time
            </p>
            {missed.length > 0 && (
              <div className="mt-5 rounded-xl bg-surface-2 p-3 text-left">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Moves to remember</p>
                <ul className="flex flex-col gap-1.5">
                  {missed.map((c) => (
                    <li key={c.key} className="flex items-baseline gap-2 text-sm">
                      <span className="font-mono font-bold text-primary">{c.san}</span>
                      <span className="min-w-0 flex-1 truncate text-muted">
                        {c.openingName} · move {Math.floor(c.ply / 2) + 1}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-5 flex flex-col gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  celebrated.current = false;
                  goToNext(createSession(cards));
                }}
              >
                <RotateCcw className="size-4" /> Go again
              </Button>
              <Button asChild>
                <Link href={closeHref}>Done</Link>
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!card) return null;

  const arrows: BoardArrow[] = showAnswer ? [{ from: card.from, to: card.to, tone: "good" }] : [];
  const sideName = card.side === "white" ? "White" : "Black";

  return (
    <div className="flex flex-col">
      <TrainerHeader
        title={title}
        subtitle={`${Math.min(session.index + 1, session.queue.length)} of ${session.queue.length}`}
        progress={session.index / session.queue.length}
        closeHref={closeHref}
      />
      <BoardLayout
        board={
          <ChessBoard
            fen={fen}
            orientation={card.side}
            interactive={phase === "answer"}
            onMove={submit}
            lastMove={lastMove}
            arrows={arrows}
            marks={phase === "correct" ? { [card.to]: "good" } : undefined}
            shakeKey={shakeKey}
          />
        }
      >
        <Card className="min-h-[120px] p-4" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted">{card.openingName}</Badge>
            <Badge variant="outline">Move {Math.floor(card.ply / 2) + 1}</Badge>
          </div>
          {phase === "correct" ? (
            <p className="mt-3 flex items-center gap-2 font-semibold text-primary" data-testid="feedback-correct">
              <Check className="size-5" strokeWidth={3} /> {card.san} — correct
            </p>
          ) : showAnswer ? (
            <div className="mt-3" data-testid="feedback-wrong">
              <p className="flex items-center gap-2 font-semibold text-danger">
                <X className="size-5" strokeWidth={3} /> The move is {card.san}
              </p>
              {card.note && <p className="mt-1 text-sm leading-relaxed">{card.note}</p>}
              <p className="mt-1 text-xs text-muted">Play it on the board to continue.</p>
            </div>
          ) : (
            <p className="mt-3 font-semibold" data-testid="prompt">
              {card.lead ? `They played ${card.lead.san}. ` : ""}Your move as {sideName}.
            </p>
          )}
        </Card>
        {phase === "answer" && !showAnswer && (
          <Button variant="ghost" className="text-muted" onClick={() => submit(null)}>
            <Eye className="size-4" /> I don&apos;t know — show me
          </Button>
        )}
      </BoardLayout>
    </div>
  );
}
