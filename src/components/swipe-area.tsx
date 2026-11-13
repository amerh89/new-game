"use client";

import { motion } from "framer-motion";

/** Detects a horizontal swipe (used to step through moves on the board). */
export function SwipeArea({
  onSwipeLeft,
  onSwipeRight,
  children,
}: {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      onPanEnd={(_event, info) => {
        const { x, y } = info.offset;
        if (Math.abs(x) < 40 || Math.abs(x) < Math.abs(y) * 1.5) return;
        if (x < 0) onSwipeLeft();
        else onSwipeRight();
      }}
      style={{ touchAction: "pan-y" }}
    >
      {children}
    </motion.div>
  );
}
