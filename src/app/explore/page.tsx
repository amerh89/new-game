"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Dumbbell, GraduationCap, Plus, RefreshCcw, Target } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BoardLayout } from "@/components/board/board-layout";
import { BoardNav } from "@/components/board/board-nav";
import { ChessBoard, type BoardArrow } from "@/components/board/chess-board";
import { MoveList } from "@/components/board/move-list";
import { SwipeArea } from "@/components/swipe-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLibrary } from "@/hooks/use-data";
import { useLineViewer } from "@/hooks/use-line-viewer";
import { getCurated, getLines, GROUP_LABELS } from "@/lib/curated";
import { useProgress } from "@/store/progress";
import { cn } from "@/lib/utils";
import type { CuratedOpening, LibraryOpening, Side } from "@/lib/types";

function moveLabel(ply: number, san: string) {
  const n = Math.floor((ply - 1) / 2) + 1;
  return `${n}${ply % 2 === 1 ? "." : "…"}${san}`;
}

function RepertoireButton({ id, side }: { id: string; side: Side }) {
  const inRepertoire = useProgress((s) => s.repertoire[side].includes(id));
  const add = useProgress((s) => s.addToRepertoire);
  const remove = useProgress((s) => s.removeFromRepertoire);
  return (
    <Button
      variant={inRepertoire ? "secondary" : "default"}
      className="flex-1"
      data-testid="repertoire-toggle"
      onClick={() => (inRepertoire ? remove(side, id) : add(side, id))}
    >
      {inRepertoire ? <Check className="size-5 text-primary" /> : <Plus className="size-5" />}
      {inRepertoire ? "In my repertoire" : "Add to my repertoire"}
    </Button>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[15px] leading-relaxed">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function CuratedExplorer({ opening, initialLine }: { opening: CuratedOpening; initialLine: string | null }) {
  const lines = useMemo(() => getLines(opening.id), [opening.id]);
  const [lineIndex, setLineIndex] = useState(() =>
    Math.max(0, lines.findIndex((l) => l.id === initialLine)),
  );
  const [orientation, setOrientation] = useState<Side>(opening.side);
  const line = lines[lineIndex];
  const viewer = useLineViewer(line.sans);
  const { ply, setPly } = viewer;

  const arrows: BoardArrow[] = useMemo(() => {
    const idea = ply > 0 ? line.arrows[ply - 1] : undefined;
    if (idea?.length) {
      return idea.map((a) => ({ from: a.slice(0, 2), to: a.slice(2, 4), tone: "idea" as const }));
    }
    return viewer.next ? [{ from: viewer.next.from, to: viewer.next.to, tone: "hint" as const }] : [];
  }, [ply, line, viewer.next]);

  const note = ply === 0 ? line.intro : line.notes[ply - 1];
  const isYourMove = ply > 0 && (viewer.last?.color === "w") === (opening.side === "white");

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        title={opening.name}
        subtitle={`${opening.eco} · You play ${opening.side === "white" ? "White" : "Black"}`}
        back="/library"
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

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Lines">
        {lines.map((l, i) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={i === lineIndex}
            onClick={() => setLineIndex(i)}
            className={cn(
              "h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
              i === lineIndex ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface text-muted",
            )}
          >
            {l.isMain ? "Main line" : l.name}
          </button>
        ))}
      </div>

      <BoardLayout
        board={
          <SwipeArea onSwipeLeft={() => setPly(ply + 1)} onSwipeRight={() => setPly(ply - 1)}>
            <ChessBoard
              fen={viewer.fen}
              orientation={orientation}
              lastMove={viewer.last}
              arrows={arrows}
            />
          </SwipeArea>
        }
      >
        <MoveList sans={line.sans} ply={ply} onSelect={setPly} />
        <BoardNav ply={ply} total={viewer.total} onChange={setPly} />

        <Card className="min-h-[104px] p-4" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${line.id}-${ply}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="mb-1 flex items-center gap-2">
                {ply === 0 ? (
                  <Badge variant="muted">{line.isMain ? "Main line" : "Sideline"}</Badge>
                ) : (
                  <>
                    <span className="font-mono text-base font-bold">{moveLabel(ply, line.sans[ply - 1])}</span>
                    <Badge variant={isYourMove ? "default" : "muted"}>{isYourMove ? "Your move" : "Opponent"}</Badge>
                  </>
                )}
              </div>
              <p className="text-[15px] leading-relaxed" data-testid="explanation">
                {ply === 0 ? <strong className="font-semibold">{line.name}. </strong> : null}
                {note}
              </p>
              {ply === 0 && <p className="mt-2 text-xs text-muted">Tap Next or swipe the board to step through.</p>}
            </motion.div>
          </AnimatePresence>
        </Card>

        <div className="flex flex-wrap gap-2">
          <RepertoireButton id={opening.id} side={opening.side} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline">
            <Link href={`/train/session?mode=learn&line=${encodeURIComponent(line.id)}`}>
              <GraduationCap className="size-5" /> Learn line
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/train/session?mode=drill&opening=${opening.id}`}>
              <Dumbbell className="size-5" /> Drill
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="mistakes">Mistakes</TabsTrigger>
            <TabsTrigger value="traps">Traps</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="flex flex-col gap-3">
            <Card className="p-4">
              <Badge variant={opening.trainable ? "default" : "info"}>{GROUP_LABELS[opening.group]}</Badge>
              <p className="mt-3 text-[15px] leading-relaxed">{opening.summary}</p>
            </Card>
            <Card className="p-4">
              <h3 className="mb-3 font-semibold">Main ideas</h3>
              <BulletList items={opening.ideas} />
            </Card>
            <Card className="p-4">
              <h3 className="mb-3 font-semibold">Typical plans</h3>
              <BulletList items={opening.plans} />
            </Card>
          </TabsContent>
          <TabsContent value="mistakes" className="flex flex-col gap-3">
            {opening.mistakes.map((m) => (
              <Card key={m.title} className="p-4">
                <h3 className="flex items-start gap-2 font-semibold">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-accent" /> {m.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{m.text}</p>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="traps" className="flex flex-col gap-3">
            {opening.traps.map((t) => (
              <Card key={t.name} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="flex items-start gap-2 font-semibold">
                    <Target className={cn("mt-0.5 size-5 shrink-0", t.kind === "for" ? "text-primary" : "text-danger")} />
                    {t.name}
                  </h3>
                  <Badge variant={t.kind === "for" ? "default" : "danger"}>
                    {t.kind === "for" ? "You set it" : "Avoid it"}
                  </Badge>
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{t.text}</p>
                {t.trapId && (
                  <Button asChild variant="link" className="mt-1 h-11 px-0">
                    <Link href={`/mates/trap?id=${t.trapId}`}>See the full lesson</Link>
                  </Button>
                )}
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </BoardLayout>
    </div>
  );
}

function LibraryExplorer({ opening }: { opening: LibraryOpening }) {
  const sans = useMemo(() => opening.moves.split(" "), [opening.moves]);
  const [orientation, setOrientation] = useState<Side>(opening.side);
  const [side, setSide] = useState<Side>(opening.side);
  const viewer = useLineViewer(sans, undefined, sans.length);
  const { ply, setPly } = viewer;
  const repId = `lib:${opening.id}`;
  const arrows: BoardArrow[] = viewer.next ? [{ from: viewer.next.from, to: viewer.next.to, tone: "hint" }] : [];

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        title={opening.name}
        subtitle={`ECO ${opening.eco}`}
        back="/library"
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
          <SwipeArea onSwipeLeft={() => setPly(ply + 1)} onSwipeRight={() => setPly(ply - 1)}>
            <ChessBoard fen={viewer.fen} orientation={orientation} lastMove={viewer.last} arrows={arrows} />
          </SwipeArea>
        }
      >
        <MoveList sans={sans} ply={ply} onSelect={setPly} />
        <BoardNav ply={ply} total={viewer.total} onChange={setPly} />

        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{opening.eco}</Badge>
            <Badge variant="muted">{opening.family}</Badge>
          </div>
          <h2 className="mt-3 text-lg font-semibold leading-tight">{opening.name}</h2>
          {opening.variation && <p className="mt-1 text-sm text-muted">Variation: {opening.variation}</p>}
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {sans.length} half-moves. This opening does not have a written lesson yet, but you can still step through
            it and add it to your repertoire to train the moves.
          </p>
        </Card>

        <Card className="p-4">
          <p className="mb-2 text-sm font-semibold">Train it as</p>
          <div className="grid grid-cols-2 gap-2">
            {(["white", "black"] as const).map((s) => (
              <Button key={s} variant={side === s ? "secondary" : "outline"} onClick={() => setSide(s)} aria-pressed={side === s}>
                {side === s && <Check className="size-4 text-primary" />}
                {s === "white" ? "White" : "Black"}
              </Button>
            ))}
          </div>
          <div className="mt-3 flex">
            <RepertoireButton id={repId} side={side} />
          </div>
        </Card>
      </BoardLayout>
    </div>
  );
}

function Explorer() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const curated = getCurated(id);
  const library = useLibrary();

  if (curated) return <CuratedExplorer key={curated.id} opening={curated} initialLine={params.get("line")} />;

  if (!library) {
    return (
      <div className="flex flex-col gap-3">
        <PageHeader title="Loading…" back="/library" />
        <div className="bleed aspect-square animate-pulse bg-surface sm:mx-0 sm:max-w-[560px] sm:rounded-2xl" />
      </div>
    );
  }

  const opening = library.find((o) => o.id === id);
  if (!opening) {
    return (
      <div className="flex flex-col gap-3">
        <PageHeader title="Opening not found" back="/library" />
        <Card className="p-6 text-center">
          <p className="text-muted">We could not find that opening.</p>
          <Button asChild className="mt-4">
            <Link href="/library">Back to the library</Link>
          </Button>
        </Card>
      </div>
    );
  }
  return <LibraryExplorer key={opening.id} opening={opening} />;
}

export default function ExplorePage() {
  return (
    <Suspense>
      <Explorer />
    </Suspense>
  );
}
