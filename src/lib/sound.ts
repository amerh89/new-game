"use client";

import { useSettings } from "@/store/settings";

/**
 * All sounds are synthesised with the Web Audio API — no audio files, so
 * nothing to download and nothing to license.
 */
export type SoundName = "move" | "capture" | "check" | "success" | "fail";

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  if (context.state === "suspended") void context.resume();
  return context;
}

/** iOS only lets audio start from a tap. Call this once on the first touch. */
export function unlockAudio() {
  getContext();
}

function tone(
  ctx: AudioContext,
  { freq, start = 0, duration = 0.12, type = "sine", gain = 0.2, endFreq }: {
    freq: number;
    start?: number;
    duration?: number;
    type?: OscillatorType;
    gain?: number;
    endFreq?: number;
  },
) {
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

/** A short burst of filtered noise: the "knock" of a piece on wood. */
function knock(ctx: AudioContext, { start = 0, duration = 0.05, freq = 1400, gain = 0.5 }) {
  const t = ctx.currentTime + start;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = 1.2;
  const amp = ctx.createGain();
  amp.gain.value = gain;
  source.connect(filter).connect(amp).connect(ctx.destination);
  source.start(t);
}

export function playSound(name: SoundName) {
  if (useSettings.getState().muted) return;
  const ctx = getContext();
  if (!ctx) return;
  try {
    switch (name) {
      case "move":
        knock(ctx, { freq: 1100, gain: 0.55 });
        tone(ctx, { freq: 190, endFreq: 120, duration: 0.07, gain: 0.18 });
        break;
      case "capture":
        knock(ctx, { freq: 1900, gain: 0.7, duration: 0.04 });
        knock(ctx, { freq: 900, gain: 0.6, start: 0.035, duration: 0.07 });
        tone(ctx, { freq: 150, endFreq: 90, duration: 0.1, gain: 0.22 });
        break;
      case "check":
        knock(ctx, { freq: 1100, gain: 0.5 });
        tone(ctx, { freq: 660, duration: 0.09, type: "triangle", gain: 0.16, start: 0.02 });
        tone(ctx, { freq: 880, duration: 0.14, type: "triangle", gain: 0.16, start: 0.1 });
        break;
      case "success":
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
          tone(ctx, { freq, start: i * 0.075, duration: 0.2, type: "triangle", gain: 0.15 }),
        );
        break;
      case "fail":
        tone(ctx, { freq: 220, endFreq: 150, duration: 0.18, type: "sawtooth", gain: 0.09 });
        tone(ctx, { freq: 165, endFreq: 110, duration: 0.24, type: "sawtooth", gain: 0.09, start: 0.1 });
        break;
    }
  } catch {
    // Audio is a nice-to-have; never let it break the app.
  }
}

/** Picks the right sound for a move that was just played. */
export function playMoveSound(move: { captured: boolean; check: boolean }) {
  playSound(move.check ? "check" : move.captured ? "capture" : "move");
}
