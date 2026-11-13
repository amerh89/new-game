"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, Star, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLibrary } from "@/hooks/use-data";
import { getCuratedOpenings, GROUP_LABELS } from "@/lib/curated";
import { formatMoves } from "@/lib/chess-utils";
import { cn } from "@/lib/utils";

type FirstMove = "all" | "e4" | "d4" | "other";
type Scope = "all" | "curated";

const PAGE_SIZE = 40;

function normalise(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .toLowerCase();
}

function matchesFirstMove(first: string, filter: FirstMove) {
  if (filter === "all") return true;
  if (filter === "other") return first !== "e4" && first !== "d4";
  return first === filter;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
        active ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface text-muted",
      )}
    >
      {children}
    </button>
  );
}

export default function LibraryPage() {
  const library = useLibrary();
  const [query, setQuery] = useState("");
  const [firstMove, setFirstMove] = useState<FirstMove>("all");
  const [scope, setScope] = useState<Scope>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const sentinel = useRef<HTMLDivElement>(null);

  const q = normalise(query.trim());

  const curated = useMemo(
    () =>
      getCuratedOpenings().filter((o) => {
        if (!matchesFirstMove(o.mainLine.moves[0][0], firstMove)) return false;
        if (!q) return true;
        return normalise(`${o.name} ${o.eco} ${o.tagline}`).includes(q);
      }),
    [q, firstMove],
  );

  const results = useMemo(() => {
    if (!library || scope === "curated") return [];
    const words = q.split(/\s+/).filter(Boolean);
    return library.filter((o) => {
      const first = o.moves.split(" ", 1)[0];
      if (!matchesFirstMove(first, firstMove)) return false;
      if (words.length === 0) return true;
      const haystack = normalise(`${o.eco} ${o.name}`);
      return words.every((w) => haystack.includes(w));
    });
  }, [library, q, firstMove, scope]);

  // Reset paging when the filters change.
  const filterKey = `${q}|${firstMove}|${scope}`;
  const [seenKey, setSeenKey] = useState(filterKey);
  if (seenKey !== filterKey) {
    setSeenKey(filterKey);
    setLimit(PAGE_SIZE);
  }

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setLimit((n) => n + PAGE_SIZE);
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [results.length]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Library"
        subtitle={library ? `${library.length.toLocaleString()} openings` : "Loading openings…"}
      />

      <div className="sticky top-[env(safe-area-inset-top,0px)] z-20 -mx-4 flex flex-col gap-3 bg-background/90 px-4 py-2 backdrop-blur-xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <Input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Search by name or ECO code (e.g. C50)"
            aria-label="Search openings"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 pr-12 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center text-muted"
            >
              <X className="size-5" />
            </button>
          )}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <Chip active={firstMove === "all"} onClick={() => setFirstMove("all")}>
            All moves
          </Chip>
          <Chip active={firstMove === "e4"} onClick={() => setFirstMove("e4")}>
            1.e4
          </Chip>
          <Chip active={firstMove === "d4"} onClick={() => setFirstMove("d4")}>
            1.d4
          </Chip>
          <Chip active={firstMove === "other"} onClick={() => setFirstMove("other")}>
            Other
          </Chip>
          <span className="mx-1 w-px shrink-0 self-stretch bg-border" />
          <Chip active={scope === "curated"} onClick={() => setScope(scope === "curated" ? "all" : "curated")}>
            <span className="flex items-center gap-1.5">
              <Star className="size-4" /> Curated only
            </span>
          </Chip>
        </div>
      </div>

      {curated.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <Star className="size-4 text-accent" /> Curated lessons
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {curated.map((o) => (
              <Link key={o.id} href={`/explore?id=${o.id}`} data-testid="curated-result">
                <Card className="flex h-full items-center gap-3 p-4 active:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{o.name}</p>
                    <p className="mt-0.5 truncate text-sm text-muted">{o.tagline}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="muted">{o.eco}</Badge>
                      <Badge variant={o.trainable ? "default" : "info"}>{GROUP_LABELS[o.group]}</Badge>
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted" />
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {scope === "all" && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            All openings{library ? ` · ${results.length.toLocaleString()}` : ""}
          </h2>
          {!library ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-[68px] animate-pulse rounded-2xl bg-surface" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted">
              No openings match “{query}”. Try a shorter name or an ECO code like B12.
            </Card>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
              {results.slice(0, limit).map((o) => (
                <li key={o.id} className="border-b border-border last:border-b-0">
                  <Link
                    href={`/explore?id=${o.id}`}
                    data-testid="library-result"
                    className="flex min-h-[68px] items-center gap-3 px-4 py-2.5 active:bg-surface-2"
                  >
                    <span className="w-10 shrink-0 font-mono text-xs font-bold text-primary">{o.eco}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium leading-tight">{o.name}</span>
                      <span className="block truncate font-mono text-xs text-muted">
                        {formatMoves(o.moves.split(" "))}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div ref={sentinel} className="h-4" />
        </section>
      )}

      {scope === "curated" && curated.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted">No curated lessons match your search.</Card>
      )}
    </div>
  );
}
