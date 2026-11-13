"use client";

import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BoardNavProps {
  ply: number;
  total: number;
  onChange: (ply: number) => void;
  children?: React.ReactNode;
}

/** Start / Prev / Next / End buttons, sized for thumbs. */
export function BoardNav({ ply, total, onChange, children }: BoardNavProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="icon" aria-label="Start" disabled={ply === 0} onClick={() => onChange(0)}>
        <ChevronFirst className="size-5" />
      </Button>
      <Button
        variant="secondary"
        className="flex-1"
        aria-label="Previous move"
        disabled={ply === 0}
        onClick={() => onChange(ply - 1)}
      >
        <ChevronLeft className="size-5" /> Prev
      </Button>
      <Button
        className="flex-1"
        aria-label="Next move"
        disabled={ply >= total}
        onClick={() => onChange(ply + 1)}
      >
        Next <ChevronRight className="size-5" />
      </Button>
      <Button variant="secondary" size="icon" aria-label="End" disabled={ply >= total} onClick={() => onChange(total)}>
        <ChevronLast className="size-5" />
      </Button>
      {children}
    </div>
  );
}
