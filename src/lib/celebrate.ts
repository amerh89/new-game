"use client";

import confetti from "canvas-confetti";

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const COLORS = ["#34d399", "#fbbf24", "#60a5fa", "#f472b6", "#ffffff"];

/** A small, quick burst — for a finished line or a solved puzzle. */
export function celebrate() {
  if (reducedMotion()) return;
  void confetti({
    particleCount: 60,
    spread: 70,
    startVelocity: 32,
    origin: { y: 0.7 },
    scalar: 0.9,
    ticks: 140,
    colors: COLORS,
    disableForReducedMotion: true,
  });
}

/** A bigger one from both sides — for streak milestones and great test scores. */
export function celebrateBig() {
  if (reducedMotion()) return;
  for (const x of [0.15, 0.85]) {
    void confetti({
      particleCount: 70,
      angle: x < 0.5 ? 60 : 120,
      spread: 65,
      startVelocity: 42,
      origin: { x, y: 0.75 },
      ticks: 180,
      colors: COLORS,
      disableForReducedMotion: true,
    });
  }
}
