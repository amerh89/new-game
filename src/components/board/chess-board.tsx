"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard, defaultPieces, type PieceDropHandlerArgs, type SquareHandlerArgs } from "react-chessboard";
import { motion, useAnimationControls } from "framer-motion";
import { isPromotion, legalTargets, type MoveInput } from "@/lib/chess-utils";
import { BOARD_THEMES, useSettings } from "@/store/settings";
import { cn } from "@/lib/utils";
import type { Side } from "@/lib/types";

export interface BoardArrow {
  from: string;
  to: string;
  tone?: "hint" | "idea" | "good" | "bad";
}

const ARROW_COLORS: Record<NonNullable<BoardArrow["tone"]>, string> = {
  hint: "#f59e0b",
  idea: "#38bdf8",
  good: "#22c55e",
  bad: "#ef4444",
};

interface ChessBoardProps {
  fen: string;
  orientation?: Side;
  /** When true you can move the pieces of the side to move. */
  interactive?: boolean;
  /** Called with a LEGAL move. Return false to reject it (the piece snaps back). */
  onMove?: (move: MoveInput) => boolean;
  lastMove?: { from: string; to: string } | null;
  arrows?: BoardArrow[];
  /** Squares to tint, e.g. a hinted piece. */
  marks?: Record<string, "hint" | "good" | "bad">;
  /** Change this number to shake the board (wrong move). */
  shakeKey?: number;
  animationMs?: number;
  className?: string;
}

const PROMOTION_PIECES = ["q", "n", "r", "b"] as const;

export function ChessBoard({
  fen,
  orientation = "white",
  interactive = false,
  onMove,
  lastMove,
  arrows,
  marks,
  shakeKey = 0,
  animationMs = 260,
  className,
}: ChessBoardProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const boardTheme = useSettings((s) => s.boardTheme);
  const coordinates = useSettings((s) => s.coordinates);
  const theme = BOARD_THEMES[boardTheme];
  const controls = useAnimationControls();

  const [selected, setSelected] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);

  // Clear any selection when the position changes.
  const [seenFen, setSeenFen] = useState(fen);
  if (seenFen !== fen) {
    setSeenFen(fen);
    setSelected(null);
    setPendingPromotion(null);
  }

  useEffect(() => {
    if (shakeKey > 0) {
      void controls.start({
        x: [0, -10, 10, -8, 8, -4, 4, 0],
        transition: { duration: 0.42, ease: "easeInOut" },
      });
    }
  }, [shakeKey, controls]);

  const turn = fen.split(" ")[1] === "b" ? "b" : "w";

  const { targets, checkSquare } = useMemo(() => {
    const chess = new Chess(fen);
    let check: string | null = null;
    if (chess.inCheck()) {
      for (const row of chess.board()) {
        for (const cell of row) {
          if (cell && cell.type === "k" && cell.color === chess.turn()) check = cell.square;
        }
      }
    }
    return {
      targets: selected ? legalTargets(fen, selected) : [],
      checkSquare: check,
    };
  }, [fen, selected]);

  const attempt = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      if (!interactive || !onMove) return false;
      if (!legalTargets(fen, from).includes(to)) return false;
      if (!promotion && isPromotion(fen, from, to)) {
        setPendingPromotion({ from, to });
        setSelected(null);
        return false;
      }
      setSelected(null);
      return onMove({ from, to, promotion });
    },
    [fen, interactive, onMove],
  );

  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
      if (!targetSquare || sourceSquare === targetSquare) return false;
      return attempt(sourceSquare, targetSquare);
    },
    [attempt],
  );

  const onSquareClick = useCallback(
    ({ square }: SquareHandlerArgs) => {
      if (!interactive) return;
      if (selected && selected !== square && targets.includes(square)) {
        attempt(selected, square);
        return;
      }
      const piece = new Chess(fen).get(square as Square);
      if (piece && piece.color === turn) {
        setSelected(selected === square ? null : square);
      } else {
        setSelected(null);
      }
    },
    [attempt, fen, interactive, selected, targets, turn],
  );

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: "rgba(250, 204, 21, 0.38)" };
      styles[lastMove.to] = { backgroundColor: "rgba(250, 204, 21, 0.5)" };
    }
    if (checkSquare) {
      styles[checkSquare] = {
        background: "radial-gradient(circle, rgba(239,68,68,0.9) 0%, rgba(239,68,68,0.45) 45%, transparent 75%)",
      };
    }
    for (const [square, tone] of Object.entries(marks ?? {})) {
      const color =
        tone === "good" ? "rgba(34,197,94,0.55)" : tone === "bad" ? "rgba(239,68,68,0.55)" : "rgba(245,158,11,0.6)";
      styles[square] = { boxShadow: `inset 0 0 0 4px ${color}` };
    }
    if (selected) {
      styles[selected] = { ...styles[selected], backgroundColor: "rgba(56, 189, 248, 0.5)" };
      const chess = new Chess(fen);
      for (const target of targets) {
        const occupied = Boolean(chess.get(target as Square));
        styles[target] = {
          ...styles[target],
          backgroundImage: occupied
            ? "radial-gradient(circle, transparent 0 58%, rgba(0,0,0,0.28) 59% 68%, transparent 69%)"
            : "radial-gradient(circle, rgba(0,0,0,0.28) 0 19%, transparent 20%)",
        };
      }
    }
    return styles;
  }, [lastMove, checkSquare, marks, selected, targets, fen]);

  const boardArrows = useMemo(
    () =>
      (arrows ?? []).map((a) => ({
        startSquare: a.from,
        endSquare: a.to,
        color: ARROW_COLORS[a.tone ?? "hint"],
      })),
    [arrows],
  );

  const notationStyle = { fontSize: "10px", fontWeight: 700 } as const;

  return (
    <motion.div
      animate={controls}
      className={cn(
        "relative mx-auto aspect-square w-full max-w-[560px] select-none overflow-hidden sm:rounded-2xl sm:shadow-card",
        className,
      )}
      data-testid="chess-board"
      data-fen={fen}
    >
      <Chessboard
        options={{
          id: `board-${id}`,
          position: fen,
          boardOrientation: orientation,
          animationDurationInMs: animationMs,
          showNotation: coordinates,
          allowDragging: interactive,
          allowDrawingArrows: false,
          allowDragOffBoard: false,
          dragActivationDistance: 4,
          canDragPiece: ({ piece }) => interactive && piece.pieceType[0] === turn,
          onPieceDrop,
          onSquareClick,
          arrows: boardArrows,
          clearArrowsOnClick: false,
          clearArrowsOnPositionChange: false,
          squareStyles,
          lightSquareStyle: { backgroundColor: theme.light },
          darkSquareStyle: { backgroundColor: theme.dark },
          lightSquareNotationStyle: { ...notationStyle, color: theme.dark },
          darkSquareNotationStyle: { ...notationStyle, color: theme.light },
          dropSquareStyle: { boxShadow: "inset 0 0 0 4px rgba(56,189,248,0.75)" },
          boardStyle: { touchAction: interactive ? "none" : "pan-y" },
        }}
      />

      {pendingPromotion && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
          <div className="rounded-2xl border border-border bg-surface p-3 shadow-2xl">
            <p className="mb-2 text-center text-sm font-semibold">Promote to</p>
            <div className="flex gap-2">
              {PROMOTION_PIECES.map((p) => {
                const Piece = defaultPieces[`${turn}${p.toUpperCase()}`];
                return (
                  <button
                    key={p}
                    type="button"
                    aria-label={`Promote to ${{ q: "queen", n: "knight", r: "rook", b: "bishop" }[p]}`}
                    className="size-14 rounded-xl bg-surface-2 p-1 active:scale-95"
                    onClick={() => {
                      const move = pendingPromotion;
                      setPendingPromotion(null);
                      attempt(move.from, move.to, p);
                    }}
                  >
                    <Piece />
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="mt-2 h-11 w-full rounded-xl text-sm font-medium text-muted"
              onClick={() => setPendingPromotion(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
