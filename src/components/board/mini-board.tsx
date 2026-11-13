"use client";

import { Chessboard } from "react-chessboard";
import { BOARD_THEMES, useSettings } from "@/store/settings";
import { cn } from "@/lib/utils";
import type { Side } from "@/lib/types";

/** A small, static board used for previews. */
export function MiniBoard({
  fen,
  orientation = "white",
  className,
}: {
  fen: string;
  orientation?: Side;
  className?: string;
}) {
  const theme = BOARD_THEMES[useSettings((s) => s.boardTheme)];
  return (
    <div className={cn("pointer-events-none aspect-square overflow-hidden rounded-lg", className)} aria-hidden>
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          allowDragging: false,
          allowDrawingArrows: false,
          showNotation: false,
          showAnimations: false,
          lightSquareStyle: { backgroundColor: theme.light },
          darkSquareStyle: { backgroundColor: theme.dark },
        }}
      />
    </div>
  );
}
