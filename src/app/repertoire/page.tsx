"use client";

import Link from "next/link";
import { BookOpen, Check, GraduationCap, Plus, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRepertoire, type RepertoireEntry } from "@/hooks/use-data";
import { getCuratedOpenings, starterRepertoire } from "@/lib/curated";
import { buildDeck } from "@/lib/training/engine";
import { useProgress } from "@/store/progress";
import type { Side } from "@/lib/types";

function EntryCard({ entry }: { entry: RepertoireEntry }) {
  const cards = useProgress((s) => s.cards);
  const learnedLines = useProgress((s) => s.learnedLines);
  const remove = useProgress((s) => s.removeFromRepertoire);

  const deck = buildDeck(entry.lines);
  const seen = deck.filter((c) => cards[c.key]).length;
  const learned = entry.lines.filter((l) => learnedLines[l.id]).length;
  const nextLine = entry.lines.find((l) => !learnedLines[l.id]) ?? entry.lines[0];
  const exploreId = entry.id.startsWith("lib:") ? entry.id.slice(4) : entry.id;
  const isStarter = starterRepertoire[entry.side].includes(entry.id);

  return (
    <Card className="p-4" data-testid="repertoire-entry">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold leading-tight">{entry.name}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge variant="muted">{entry.eco}</Badge>
            {isStarter && <Badge variant="accent">Recommended</Badge>}
            {!entry.curated && <Badge variant="outline">From library</Badge>}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove ${entry.name}`}
          className="-mr-2 -mt-2 text-muted"
          onClick={() => remove(entry.side, entry.id)}
        >
          <Trash2 className="size-5" />
        </Button>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs text-muted">
          <span>
            {learned} of {entry.lines.length} line{entry.lines.length === 1 ? "" : "s"} learned
          </span>
          <span className="tabular-nums">
            {seen}/{deck.length} positions
          </span>
        </div>
        <Progress value={deck.length ? seen / deck.length : 0} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/explore?id=${exploreId}`}>
            <BookOpen className="size-4" /> Explore
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href={`/train/session?mode=learn&line=${encodeURIComponent(nextLine.id)}`}>
            <GraduationCap className="size-4" /> {learned === entry.lines.length ? "Practise" : "Learn"}
          </Link>
        </Button>
      </div>
    </Card>
  );
}

function SideSection({ side, entries }: { side: Side; entries: RepertoireEntry[] }) {
  const add = useProgress((s) => s.addToRepertoire);
  const chosen = new Set(entries.map((e) => e.id));
  const suggestions = getCuratedOpenings().filter((o) => o.side === side && !chosen.has(o.id));

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <span
          className={`size-4 rounded-full border border-border ${side === "white" ? "bg-white" : "bg-neutral-900"}`}
        />
        Playing {side === "white" ? "White" : "Black"}
        <span className="text-sm font-medium text-muted">· {entries.length}</span>
      </h2>

      {entries.length === 0 ? (
        <Card className="p-5 text-center text-sm text-muted">
          Nothing here yet. Add an opening below or from the library.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Add a curated opening</p>
          <div className="flex flex-col gap-2">
            {suggestions.map((o) => (
              <div key={o.id} className="flex items-center gap-2 rounded-2xl border border-dashed border-border p-2 pl-4">
                <Link href={`/explore?id=${o.id}`} className="min-w-0 flex-1 py-1">
                  <p className="truncate text-[15px] font-medium">{o.name}</p>
                  <p className="truncate text-xs text-muted">
                    {o.trainable ? o.tagline : `Recognise only · ${o.tagline}`}
                  </p>
                </Link>
                <Button variant="secondary" size="icon" aria-label={`Add ${o.name}`} onClick={() => add(side, o.id)}>
                  <Plus className="size-5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function RepertoirePage() {
  const { entries, ready } = useRepertoire();
  const repertoire = useProgress((s) => s.repertoire);
  const resetRepertoire = useProgress((s) => s.resetRepertoire);

  const isStarter =
    JSON.stringify(repertoire.white) === JSON.stringify(starterRepertoire.white) &&
    JSON.stringify(repertoire.black) === JSON.stringify(starterRepertoire.black);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My repertoire" subtitle="The openings you are learning" back="/" />

      <Card className="card-gradient p-4">
        <p className="flex items-center gap-2 font-semibold">
          <Check className="size-5 text-primary" /> A starter repertoire for around 1000 rating
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          One opening for White and solid answers to 1.e4 and 1.d4 for Black. That is all you need at first — add
          more whenever you like.
        </p>
      </Card>

      {!ready && <p className="text-sm text-muted">Loading your library openings…</p>}

      <SideSection side="white" entries={entries.filter((e) => e.side === "white")} />
      <SideSection side="black" entries={entries.filter((e) => e.side === "black")} />

      <div className="flex flex-col gap-2">
        <Button asChild variant="outline">
          <Link href="/library">
            <Plus className="size-5" /> Add from the library
          </Link>
        </Button>
        {!isStarter && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-muted">
                <RotateCcw className="size-4" /> Reset to the recommended repertoire
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Reset your repertoire?</AlertDialogTitle>
              <AlertDialogDescription>
                Your list of openings goes back to the recommended starter set. Your training progress is kept.
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogAction onClick={resetRepertoire}>Reset repertoire</AlertDialogAction>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
