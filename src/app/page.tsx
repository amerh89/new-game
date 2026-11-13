"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  Crown,
  Flame,
  Layers,
  Lightbulb,
  Moon,
  Puzzle,
  Settings,
  Sparkles,
  Sun,
  Swords,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTraining } from "@/hooks/use-training";
import { useProgress } from "@/store/progress";
import { useSettings } from "@/store/settings";
import { currentStreak, dateKey, levelInfo } from "@/lib/progress-utils";

const QUICK_LINKS = [
  { href: "/repertoire", label: "My repertoire", hint: "Your White and Black lines", icon: Layers },
  { href: "/library", label: "Opening library", hint: "Search every opening", icon: BookOpen },
  { href: "/quiz", label: "Quizzes", hint: "Test what you know", icon: Lightbulb },
  { href: "/mates", label: "Traps & mates", hint: "Quick wins to learn", icon: Crown },
  { href: "/mates/puzzles", label: "Mate puzzles", hint: "Mate in 1, 2 and 3", icon: Puzzle },
  { href: "/progress", label: "Progress", hint: "Accuracy and streaks", icon: BarChart3 },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Up late?";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const training = useTraining();
  const xp = useProgress((s) => s.xp);
  const activity = useProgress((s) => s.activity);
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);

  const streak = currentStreak(activity);
  const level = levelInfo(xp);
  const today = activity[dateKey()];
  const doneToday = (today?.answers ?? 0) > 0;
  const due = training.due.length;
  const nextLine = training.unlearned[0];

  const cta =
    due > 0
      ? { href: "/train/session?mode=review", label: "Continue training", sub: `${due} card${due === 1 ? "" : "s"} to review` }
      : nextLine
        ? {
            href: `/train/session?mode=learn&line=${encodeURIComponent(nextLine.id)}`,
            label: "Continue training",
            sub: `Learn: ${nextLine.openingName}`,
          }
        : { href: "/train", label: "Continue training", sub: "Drill your openings" };

  return (
    <div className="flex flex-col gap-5 pb-4">
      <header className="flex items-center justify-between pt-3">
        <div>
          <p className="text-sm font-medium text-muted">{greeting()}</p>
          <h1 className="text-2xl font-bold tracking-tight">OpeningsPro</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>
          <Button asChild variant="ghost" size="icon">
            <Link href="/settings" aria-label="Settings">
              <Settings className="size-5" />
            </Link>
          </Button>
        </div>
      </header>

      <motion.section
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="card-gradient overflow-hidden rounded-3xl border border-border p-5 shadow-card"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted">Today&apos;s reviews</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-5xl font-bold tabular-nums tracking-tight" data-testid="due-count">
                {due}
              </span>
              <span className="text-sm text-muted">{due === 1 ? "card due" : "cards due"}</span>
            </p>
          </div>
          <div
            className={`flex flex-col items-center rounded-2xl px-3.5 py-2 ${
              streak > 0 ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted"
            }`}
          >
            <Flame className="size-6" fill={streak > 0 && doneToday ? "currentColor" : "none"} />
            <span className="text-lg font-bold leading-tight tabular-nums" data-testid="streak">
              {streak}
            </span>
            <span className="text-[11px] font-semibold">day streak</span>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-semibold">
              <Sparkles className="size-4 text-primary" /> Level {level.level}
            </span>
            <span className="tabular-nums text-muted">
              {level.xpIntoLevel} / {level.xpForLevel} XP
            </span>
          </div>
          <Progress value={level.progress} />
        </div>

        <Button asChild size="lg" className="mt-5 w-full justify-between">
          <Link href={cta.href}>
            <span className="flex flex-col items-start leading-tight">
              <span>{cta.label}</span>
              <span className="text-xs font-medium opacity-80">{cta.sub}</span>
            </span>
            <ChevronRight className="size-5" />
          </Link>
        </Button>
        {!doneToday && streak > 0 && (
          <p className="mt-3 text-center text-xs text-muted">Practise today to keep your {streak}-day streak.</p>
        )}
      </motion.section>

      <section className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xl font-bold tabular-nums">{training.seen}</p>
          <p className="text-xs text-muted">positions learned</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold tabular-nums">{training.lines.length - training.unlearned.length}</p>
          <p className="text-xs text-muted">lines completed</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold tabular-nums">{xp}</p>
          <p className="text-xs text-muted">total XP</p>
        </Card>
      </section>

      {nextLine && due > 0 && (
        <Link href={`/train/session?mode=learn&line=${encodeURIComponent(nextLine.id)}`}>
          <Card className="flex items-center gap-3 p-4 active:bg-surface-2">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-info/15 text-info">
              <Swords className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Learn something new</p>
              <p className="truncate font-semibold">{nextLine.openingName}</p>
              <p className="truncate text-sm text-muted">{nextLine.name}</p>
            </div>
            <ChevronRight className="size-5 text-muted" />
          </Card>
        </Link>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Quick links</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {QUICK_LINKS.map(({ href, label, hint, icon: Icon }, i) => (
            <motion.div
              key={href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.25 }}
            >
              <Link href={href} className="block h-full">
                <Card className="flex h-full min-h-[104px] flex-col justify-between p-4 active:bg-surface-2">
                  <Icon className="size-6 text-primary" />
                  <div>
                    <p className="font-semibold leading-tight">{label}</p>
                    <p className="mt-0.5 text-xs text-muted">{hint}</p>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
