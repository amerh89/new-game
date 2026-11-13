"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CardSessionView } from "@/components/trainer/card-session";
import { LearnSession } from "@/components/trainer/learn-session";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLibrary, useRepertoire } from "@/hooks/use-data";
import { useTraining } from "@/hooks/use-training";
import { getCurated, getLines, getTrainingLines, libraryLine, type ResolvedLine } from "@/lib/curated";
import { shuffle } from "@/lib/chess-utils";
import { buildDeck, type TrainCard } from "@/lib/training/engine";
import { useProgress } from "@/store/progress";

const REVIEW_LIMIT = 30;
const DRILL_SIZE = 12;

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-3">
      <PageHeader title={title} back="/train" />
      <Card className="p-6 text-center">
        <p className="text-muted">{text}</p>
        <Button asChild className="mt-4">
          <Link href="/train">Back to training</Link>
        </Button>
      </Card>
    </div>
  );
}

function Loading() {
  return <div className="bleed mt-16 aspect-square animate-pulse bg-surface sm:mx-0 sm:max-w-[560px] sm:rounded-2xl" />;
}

/** Finds a line by id, in the curated content or in an opening added from the library. */
function useLine(lineId: string | null): { line: ResolvedLine | null; loading: boolean } {
  const isLibrary = Boolean(lineId?.startsWith("lib:"));
  const library = useLibrary();
  const repertoire = useProgress((s) => s.repertoire);
  return useMemo(() => {
    if (!lineId) return { line: null, loading: false };
    if (!isLibrary) {
      const openingId = lineId.split("/")[0];
      return { line: getLines(openingId).find((l) => l.id === lineId) ?? null, loading: false };
    }
    if (!library) return { line: null, loading: true };
    const id = lineId.slice(4).split("/")[0];
    const opening = library.find((o) => o.id === id);
    if (!opening) return { line: null, loading: false };
    const side = repertoire.white.includes(`lib:${id}`) ? "white" : repertoire.black.includes(`lib:${id}`) ? "black" : opening.side;
    return { line: libraryLine(opening, side), loading: false };
  }, [lineId, isLibrary, library, repertoire]);
}

function Learn({ lineId }: { lineId: string | null }) {
  const { line, loading } = useLine(lineId);
  const training = useTraining();
  if (loading) return <Loading />;
  if (!line) return <Message title="Line not found" text="We could not find that line. Pick one from the training page." />;

  const next = training.unlearned.find((l) => l.id !== line.id);
  return (
    <LearnSession
      key={line.id}
      line={line}
      closeHref="/train"
      nextHref={next ? `/train/session?mode=learn&line=${encodeURIComponent(next.id)}` : undefined}
      nextLabel={next ? `Next: ${next.isMain ? next.openingName : next.name}` : undefined}
    />
  );
}

/** Freezes the list when the session starts, so answering does not reshuffle it. */
function FrozenSession({
  initialCards,
  title,
  schedule,
}: {
  initialCards: () => TrainCard[];
  title: string;
  schedule: boolean;
}) {
  const [cards] = useState(initialCards);
  return <CardSessionView cards={cards} title={title} schedule={schedule} closeHref="/train" />;
}

function Review() {
  const training = useTraining();
  if (!training.ready) return <Loading />;
  return <FrozenSession initialCards={() => training.due.slice(0, REVIEW_LIMIT)} title="Review" schedule />;
}

function Drill({ openingId }: { openingId: string | null }) {
  const { entries, ready } = useRepertoire();

  if (!openingId) return <Message title="Drill" text="Pick an opening to drill from the training page." />;
  if (openingId.startsWith("lib:") && !ready) return <Loading />;

  const entry = entries.find((e) => e.id === openingId);
  const curated = getCurated(openingId);
  const lines = entry?.lines ?? (curated ? getTrainingLines(openingId) : []);
  if (lines.length === 0) {
    return <Message title="Drill" text="That opening is not available to drill. Add it to your repertoire first." />;
  }

  return (
    <FrozenSession
      initialCards={() => {
        const deck = buildDeck(lines);
        // Skip the very first move when there is plenty of material — it is always the same.
        const pool = deck.length > DRILL_SIZE ? deck.filter((c) => c.ply >= 2) : deck;
        return shuffle(pool).slice(0, DRILL_SIZE);
      }}
      title={`Drill · ${entry?.name ?? curated?.name ?? ""}`}
      schedule={false}
    />
  );
}

function Session() {
  const params = useSearchParams();
  const mode = params.get("mode");
  if (mode === "learn") return <Learn lineId={params.get("line")} />;
  if (mode === "drill") return <Drill key={params.get("opening")} openingId={params.get("opening")} />;
  return <Review />;
}

export default function TrainSessionPage() {
  return (
    <Suspense>
      <Session />
    </Suspense>
  );
}
