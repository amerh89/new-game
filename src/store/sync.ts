"use client";

import { create } from "zustand";

export type SyncStatus = "signed-out" | "syncing" | "synced" | "error";

interface SyncState {
  status: SyncStatus;
  email: string | null;
  lastSyncedAt: number | null;
  error: string | null;
  set: (patch: Partial<Omit<SyncState, "set">>) => void;
}

export const useSync = create<SyncState>()((set) => ({
  status: "signed-out",
  email: null,
  lastSyncedAt: null,
  error: null,
  set: (patch) => set(patch),
}));
