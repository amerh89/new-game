"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Clock, RotateCcw, Trophy, X } from "lucide-react";
import { BoardLayout } from "@/components/board/board-layout";
import { ChessBoard } from "@/components/board/chess-board";
import { MiniBoard } from "@/components/board/mini-board";
import { TrainerHeader } from "@/components/trainer-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLibrary } from "@/hooks/use-data";
import { getCuratedOpenings, getTrainingLines, getTraps } from "@/lib/curated";
import {
  generateQuiz,
  PRACTICE_QUESTION_COUNT,
  QUIZ_TYPES,
  TEST_QUESTION_COUNT,
  TEST_SECONDS_PER_QUESTION,
  type QuizQuestion,
  type QuizSources,
  type QuizType,
} from "@/lib/quiz";
import { celebrate, celebrateBig } from "@/lib/celebrate";
import { playSound } from "@/lib/sound";
import { useProgress } from "@/store/progress";
import { cn } from "@/lib/utils";

type Mode = QuizType | "test";

const ALL_TYPES: QuizType[] = ["name", "next-move", "trap", "side"];

function titleFor(mode: Mode) {
  return mode === "test" ? "Timed test" : (QUIZ_TYPES.find((q) => q.type === mode)?.title ?? "Quiz");
}

interface Answer {
  /** Index chosen, or null when the clock ran out. */
  choice: number | null;
  correct: boolean;
}

function Results({
  mode,
  questions,
  answers,
  seconds,
  onRetry,
}: {
  mode: Mode;
  questions: QuizQuestion[];
  answers: Answer[];
  seconds: number;
  onRetry: () => void;
}) {
  const score = answers.filter((a) => a.correct).length;
  const percent = Math.round((score / questions.length) * 100);
  const best = useProgress((s) => s.bestScores[mode]);
  const wrong = questions.map((q, i) => ({ q, a: answers[i] })).filter(({ a }) => !a.correct);

  return (
    <div className="flex flex-col gap-4">
      <TrainerHeader title={titleFor(mode)} subtitle="Results" closeHref="/quiz" progress={1} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="card-gradient p-6 text-center" data-testid="quiz-results">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <Trophy className="size-7" />
          </div>
          <p className="mt-4 text-5xl font-bold tabular-nums" data-testid="quiz-score">
            {score}
            <span className="text-2xl text-muted">/{questions.length}</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            {percent}% correct
            {mode === "test" ? ` · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : ""}
          </p>
          <div className="mt-3 flex justify-center gap-2">
            {best !== undefined && (
              <Badge variant={percent >= best ? "accent" : "muted"}>
                {percent >= best ? "New best!" : `Best ${best}%`}
              </Badge>
            )}
            <Badge variant="default">+{score * 5} XP</Badge>
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={onRetry}>
              <RotateCcw className="size-4" /> Try again
            </Button>
            <Button asChild variant="secondary">
              <Link href="/quiz">Back to quizzes</Link>
            </Button>
          </div>
        </Card>
      </motion.div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          {wrong.length === 0 ? "Nothing to review — every answer was right" : `Questions you missed · ${wrong.length}`}
        </h2>
        <div className="flex flex-col gap-3">
          {wrong.map(({ q, a }, i) => (
            <Card key={q.id} className="flex gap-3 p-3" data-testid="wrong-question">
              <MiniBoard fen={q.fen} orientation={q.orientation} className="w-24 shrink-0 self-start sm:w-32" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {QUIZ_TYPES.find((t) => t.type === q.type)?.title} · #{i + 1}
                </p>
                <p className="mt-0.5 text-sm font-semibold leading-snug">{q.prompt}</p>
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-danger">
                  <X className="size-4 shrink-0" />
                  <span className="truncate">{a.choice === null ? "Out of time" : q.choices[a.choice]}</span>
                </p>
                <p className="flex items-center gap-1.5 text-sm text-primary">
                  <Check className="size-4 shrink-0" />
                  <span className="truncate font-semibold">{q.choices[q.answer]}</span>
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{q.explanation}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function QuizRunner({ mode, sources, onRetry }: { mode: Mode; sources: QuizSources; onRetry: () => void }) {
  const timed = mode === "test";
  const [questions] = useState(() =>
    generateQuiz(timed ? ALL_TYPES : [mode], timed ? TEST_QUESTION_COUNT : PRACTICE_QUESTION_COUNT, sources),
  );
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState<number | null | undefined>(undefined);
  const [timeLeft, setTimeLeft] = useState(TEST_SECONDS_PER_QUESTION);
  const [finishedIn, setFinishedIn] = useState<number | null>(null);
  const startedAt = useRef<number>(0);
  const recordQuiz = useProgress((s) => s.recordQuiz);

  const question = questions[index];
  const revealed = selected !== undefined;

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const advance = useCallback(
    (all: Answer[]) => {
      if (index + 1 < questions.length) {
        setIndex(index + 1);
        setSelected(undefined);
        setTimeLeft(TEST_SECONDS_PER_QUESTION);
        return;
      }
      const seconds = Math.round((Date.now() - startedAt.current) / 1000);
      const score = all.filter((a) => a.correct).length;
      recordQuiz({ type: mode, score, total: questions.length, seconds });
      setFinishedIn(seconds);
      playSound("success");
      if (score === questions.length) celebrateBig();
      else if (score / questions.length >= 0.7) celebrate();
    },
    [index, questions.length, recordQuiz, mode],
  );

  const choose = useCallback(
    (choice: number | null) => {
      if (revealed || !question) return;
      const correct = choice === question.answer;
      const all = [...answers, { choice, correct }];
      setAnswers(all);
      setSelected(choice);
      playSound(correct ? "move" : "fail");
      if (timed) setTimeout(() => advance(all), correct ? 650 : 1300);
    },
    [revealed, question, answers, timed, advance],
  );

  // Countdown for the timed test.
  useEffect(() => {
    if (!timed || revealed || finishedIn !== null) return;
    const deadline = Date.now() + TEST_SECONDS_PER_QUESTION * 1000;
    const interval = setInterval(() => {
      const left = Math.max(0, (deadline - Date.now()) / 1000);
      setTimeLeft(left);
      if (left <= 0) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [timed, revealed, finishedIn, index]);

  useEffect(() => {
    if (!timed || revealed || finishedIn !== null || timeLeft > 0) return;
    const timer = setTimeout(() => choose(null), 0);
    return () => clearTimeout(timer);
  }, [timed, revealed, finishedIn, timeLeft, choose]);

  if (questions.length === 0) {
    return (
      <div>
        <TrainerHeader title={titleFor(mode)} closeHref="/quiz" />
        <Card className="mt-6 p-6 text-center text-muted">There are no questions available for this quiz yet.</Card>
      </div>
    );
  }

  if (finishedIn !== null) {
    return <Results mode={mode} questions={questions} answers={answers} seconds={finishedIn} onRetry={onRetry} />;
  }

  const score = answers.filter((a) => a.correct).length;

  return (
    <div className="flex flex-col">
      <TrainerHeader
        title={titleFor(mode)}
        subtitle={`Question ${index + 1} of ${questions.length}`}
        progress={(index + (revealed ? 1 : 0)) / questions.length}
        closeHref="/quiz"
        actions={
          <Badge variant="muted" className="h-8 px-3 tabular-nums">
            {score} right
          </Badge>
        }
      />
      <BoardLayout
        board={
          <ChessBoard
            key={question.id}
            fen={question.fen}
            orientation={question.orientation}
            lastMove={question.lastMove}
            animationMs={0}
          />
        }
      >
        {timed && (
          <div className="flex items-center gap-2" aria-label={`${Math.ceil(timeLeft)} seconds left`}>
            <Clock className={cn("size-4", timeLeft < 5 ? "text-danger" : "text-muted")} />
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn("h-full rounded-full", timeLeft < 5 ? "bg-danger" : "bg-accent")}
                style={{ width: `${(timeLeft / TEST_SECONDS_PER_QUESTION) * 100}%`, transition: "width 100ms linear" }}
              />
            </div>
            <span className="w-6 text-right font-mono text-sm tabular-nums">{Math.ceil(timeLeft)}</span>
          </div>
        )}

        <div>
          <h2 className="text-lg font-bold leading-snug" data-testid="quiz-prompt">
            {question.prompt}
          </h2>
          {question.movesText && question.type !== "name" && (
            <p className="no-scrollbar mt-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-muted">
              {question.movesText}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2" role="group" aria-label="Answers">
          {question.choices.map((choice, i) => {
            const isAnswer = i === question.answer;
            const isPicked = selected === i;
            return (
              <button
                key={choice}
                type="button"
                disabled={revealed}
                data-testid="quiz-choice"
                data-correct={isAnswer ? "true" : "false"}
                onClick={() => choose(i)}
                className={cn(
                  "flex min-h-14 items-center justify-between gap-2 rounded-xl border px-4 py-2 text-left text-[15px] font-semibold transition-colors",
                  !revealed && "border-border bg-surface active:bg-surface-2",
                  revealed && isAnswer && "border-primary bg-primary/15 text-primary",
                  revealed && isPicked && !isAnswer && "border-danger bg-danger/15 text-danger",
                  revealed && !isAnswer && !isPicked && "border-border bg-surface opacity-50",
                  question.type !== "name" && question.type !== "side" && "font-mono",
                )}
              >
                <span>{choice}</span>
                {revealed && isAnswer && <Check className="size-5 shrink-0" strokeWidth={3} />}
                {revealed && isPicked && !isAnswer && <X className="size-5 shrink-0" strokeWidth={3} />}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {revealed && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="p-4" aria-live="polite" data-testid="quiz-explanation">
                <p className={cn("font-semibold", selected === question.answer ? "text-primary" : "text-danger")}>
                  {selected === question.answer ? "Correct!" : selected === null ? "Out of time" : "Not quite"}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{question.explanation}</p>
              </Card>
              {!timed && (
                <Button className="mt-3 w-full" onClick={() => advance(answers)} data-testid="quiz-next">
                  {index + 1 < questions.length ? "Next question" : "See results"} <ChevronRight className="size-5" />
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </BoardLayout>
    </div>
  );
}

function Play() {
  const params = useSearchParams();
  const raw = params.get("type");
  const mode: Mode = raw === "test" || ALL_TYPES.includes(raw as QuizType) ? (raw as Mode) : "test";
  const needsLibrary = mode === "test" || mode === "name";
  const library = useLibrary();
  const [attempt, setAttempt] = useState(0);

  const sources = useMemo<QuizSources | null>(() => {
    if (needsLibrary && !library) return null;
    return {
      library: library ?? [],
      lines: getCuratedOpenings()
        .filter((o) => o.trainable)
        .flatMap((o) => getTrainingLines(o.id)),
      traps: getTraps(),
    };
  }, [library, needsLibrary]);

  if (!sources) {
    return (
      <div>
        <TrainerHeader title={titleFor(mode)} subtitle="Preparing questions…" closeHref="/quiz" />
        <div className="bleed aspect-square animate-pulse bg-surface sm:mx-0 sm:max-w-[560px] sm:rounded-2xl" />
      </div>
    );
  }

  return <QuizRunner key={`${mode}-${attempt}`} mode={mode} sources={sources} onRetry={() => setAttempt((n) => n + 1)} />;
}

export default function QuizPlayPage() {
  return (
    <Suspense>
      <Play />
    </Suspense>
  );
}
