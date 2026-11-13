"use client";

import { useEffect } from "react";
import { getSupabase, PROGRESS_TABLE, supabaseConfigured } from "@/lib/supabase";
import { selectProgressData, useProgress, type ProgressData } from "@/store/progress";
import { useSync } from "@/store/sync";

const PUSH_DELAY_MS = 2500;

/**
 * Keeps progress in step with Supabase when sync is configured and you are
 * signed in. The newest copy wins: whichever side was changed most recently
 * replaces the other. Renders nothing.
 */
export function SyncManager() {
  useEffect(() => {
    if (!supabaseConfigured) return;
    const clientPromise = getSupabase();
    if (!clientPromise) return;

    let userId: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastPushed = 0;
    let cancelled = false;
    let unsubscribeAuth: (() => void) | null = null;
    const sync = useSync.getState().set;

    async function push() {
      if (!userId) return;
      const data = selectProgressData(useProgress.getState());
      if (data.updatedAt <= lastPushed) return;
      const supabase = await clientPromise!;
      sync({ status: "syncing" });
      const { error } = await supabase.from(PROGRESS_TABLE).upsert({
        user_id: userId,
        data,
        updated_at: new Date(data.updatedAt || Date.now()).toISOString(),
      });
      if (error) {
        sync({ status: "error", error: error.message });
        return;
      }
      lastPushed = data.updatedAt;
      sync({ status: "synced", lastSyncedAt: Date.now(), error: null });
    }

    async function pull() {
      if (!userId) return;
      const supabase = await clientPromise!;
      sync({ status: "syncing" });
      const { data: row, error } = await supabase
        .from(PROGRESS_TABLE)
        .select("data")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        sync({ status: "error", error: error.message });
        return;
      }
      const remote = row?.data as ProgressData | undefined;
      const local = selectProgressData(useProgress.getState());
      if (remote && (remote.updatedAt ?? 0) > local.updatedAt) {
        useProgress.getState().replaceAll(remote);
        lastPushed = remote.updatedAt;
        sync({ status: "synced", lastSyncedAt: Date.now(), error: null });
      } else {
        await push();
        if (useSync.getState().status === "syncing") {
          sync({ status: "synced", lastSyncedAt: Date.now(), error: null });
        }
      }
    }

    const unsubscribeStore = useProgress.subscribe((state, prev) => {
      if (!userId || state.updatedAt === prev.updatedAt) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void push(), PUSH_DELAY_MS);
    });

    const flush = () => {
      if (document.visibilityState === "hidden") void push();
    };
    document.addEventListener("visibilitychange", flush);

    void clientPromise.then(async (supabase) => {
      if (cancelled) return;
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        const nextId = session?.user.id ?? null;
        if (nextId === userId) return;
        userId = nextId;
        if (userId) {
          sync({ email: session?.user.email ?? null });
          void pull();
        } else {
          sync({ status: "signed-out", email: null, lastSyncedAt: null, error: null });
        }
      });
      unsubscribeAuth = () => data.subscription.unsubscribe();
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unsubscribeStore();
      unsubscribeAuth?.();
      document.removeEventListener("visibilitychange", flush);
    };
  }, []);

  return null;
}
