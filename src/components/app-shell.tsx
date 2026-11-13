"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { isFocusRoute, TabBar } from "@/components/tab-bar";
import { SyncManager } from "@/components/sync-manager";
import { useSettings } from "@/store/settings";
import { useProgress } from "@/store/progress";
import { unlockAudio } from "@/lib/sound";

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted">
        <div className="size-14 animate-pulse rounded-2xl bg-primary/20" />
        <span className="text-sm font-medium">OpeningsPro</span>
      </div>
    </div>
  );
}

/**
 * Loads saved settings and progress from localStorage (after the first paint,
 * so the server-rendered HTML and the browser agree), applies the theme, and
 * draws the page frame with the bottom tab bar.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const theme = useSettings((s) => s.theme);
  const pathname = usePathname();

  useEffect(() => {
    void Promise.all([useSettings.persist.rehydrate(), useProgress.persist.rehydrate()]).then(() =>
      setReady(true),
    );
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#090d13" : "#f3f5f8");
  }, [theme, ready]);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  return (
    <div className="app-backdrop min-h-dvh">
      <div className="pt-safe">
        <main
          className={
            isFocusRoute(pathname)
              ? "mx-auto w-full max-w-5xl px-safe pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
              : "mx-auto w-full max-w-5xl px-safe pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
          }
        >
          {ready ? (
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          ) : (
            <Splash />
          )}
        </main>
      </div>
      <TabBar />
      {ready && <SyncManager />}
    </div>
  );
}
