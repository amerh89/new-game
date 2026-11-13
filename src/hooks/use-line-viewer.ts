"use client";

import { useCallback, useMemo, useState } from "react";
import { replaySan, START_FEN } from "@/lib/chess-utils";
import { playMoveSound } from "@/lib/sound";

/** Step forwards and backwards through a list of moves. */
export function useLineViewer(sans: string[], startFen: string = START_FEN, initialPly = 0) {
  const moves = useMemo(() => replaySan(sans, startFen), [sans, startFen]);
  const [ply, setPlyState] = useState(Math.min(initialPly, sans.length));

  // Reset when a different line is shown.
  const signature = `${startFen}|${sans.join(" ")}`;
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setPlyState(Math.min(initialPly, sans.length));
  }

  const setPly = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(moves.length, next));
      if (clamped === ply + 1) playMoveSound(moves[clamped - 1]);
      setPlyState(clamped);
    },
    [moves, ply],
  );

  const fen = ply === 0 ? startFen : moves[ply - 1].after;
  const last = ply > 0 ? moves[ply - 1] : null;
  const next = ply < moves.length ? moves[ply] : null;

  return { moves, ply, setPly, fen, last, next, total: moves.length };
}
