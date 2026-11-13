"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "dark" | "light";
export type BoardTheme = "green" | "wood" | "blue" | "slate";

export const BOARD_THEMES: Record<BoardTheme, { name: string; light: string; dark: string }> = {
  green: { name: "Classic green", light: "#ebecd0", dark: "#739552" },
  wood: { name: "Wood brown", light: "#f0d9b5", dark: "#b58863" },
  blue: { name: "Blue", light: "#dee3e6", dark: "#8ca2ad" },
  slate: { name: "Slate", light: "#cbd2db", dark: "#5f6b7d" },
};

interface SettingsState {
  theme: ThemeMode;
  boardTheme: BoardTheme;
  coordinates: boolean;
  muted: boolean;
  setTheme: (theme: ThemeMode) => void;
  setBoardTheme: (boardTheme: BoardTheme) => void;
  setCoordinates: (coordinates: boolean) => void;
  setMuted: (muted: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      boardTheme: "green",
      coordinates: true,
      muted: false,
      setTheme: (theme) => set({ theme }),
      setBoardTheme: (boardTheme) => set({ boardTheme }),
      setCoordinates: (coordinates) => set({ coordinates }),
      setMuted: (muted) => set({ muted }),
    }),
    { name: "openingspro-settings", version: 1, skipHydration: true },
  ),
);
