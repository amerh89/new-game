"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface MoveListProps {
  sans: string[];
  /** Number of moves played (0 = start position). */
  ply: number;
  onSelect?: (ply: number) => void;
  /** Ply index of the first move when the line does not start at move 1. */
  startPly?: number;
  className?: string;
}

/** A horizontally scrolling list of moves with the current one highlighted. */
export function MoveList({ sans, ply, onSelect, startPly = 0, className }: MoveListProps) {
  const container = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLButtonElement>(null);

  // Keep the current move in view. Only the list itself scrolls — never the page.
  useEffect(() => {
    const list = container.current;
    if (!list) return;
    const button = current.current;
    const left = button ? button.offsetLeft - list.clientWidth / 2 + button.offsetWidth / 2 : 0;
    list.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [ply]);

  return (
    <div
      ref={container}
      className={cn("no-scrollbar relative flex min-h-[52px] items-center gap-0.5 overflow-x-auto py-1", className)}
      role="list"
      aria-label="Moves"
    >
      {sans.map((san, i) => {
        const abs = startPly + i;
        const active = i === ply - 1;
        return (
          <span key={i} className="flex shrink-0 items-center" role="listitem">
            {(abs % 2 === 0 || i === 0) && (
              <span className="pl-1.5 pr-0.5 font-mono text-xs text-muted">
                {Math.floor(abs / 2) + 1}
                {abs % 2 === 0 ? "." : "…"}
              </span>
            )}
            <button
              ref={active ? current : undefined}
              type="button"
              onClick={() => onSelect?.(i + 1)}
              disabled={!onSelect}
              className={cn(
                "min-h-11 min-w-10 rounded-lg px-2 text-[15px] font-semibold transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-foreground active:bg-surface-2",
                i >= ply && !active && "text-muted",
              )}
            >
              {san}
            </button>
          </span>
        );
      })}
    </div>
  );
}
