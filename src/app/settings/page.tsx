"use client";

import { useState } from "react";
import { Check, Cloud, CloudOff, Grid3x3, Loader2, LogOut, Mail, Moon, Share, Sun, Volume2, VolumeX } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { playSound } from "@/lib/sound";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import { BOARD_THEMES, useSettings, type BoardTheme } from "@/store/settings";
import { useSync } from "@/store/sync";
import { cn } from "@/lib/utils";

function Row({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon: typeof Sun;
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-16 items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <Icon className="size-5 shrink-0 text-muted" />
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-tight">{title}</p>
        <p className="text-sm text-muted">{text}</p>
      </div>
      {children}
    </div>
  );
}

function BoardSwatch({ theme, active, onSelect }: { theme: BoardTheme; active: boolean; onSelect: () => void }) {
  const colors = BOARD_THEMES[theme];
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      data-testid={`board-theme-${theme}`}
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border p-2.5 transition-colors",
        active ? "border-primary bg-primary/10" : "border-border bg-surface",
      )}
    >
      <span className="grid w-full max-w-20 grid-cols-4 overflow-hidden rounded-lg" aria-hidden>
        {Array.from({ length: 16 }, (_, i) => (
          <span
            key={i}
            className="aspect-square"
            style={{ backgroundColor: (Math.floor(i / 4) + i) % 2 === 0 ? colors.light : colors.dark }}
          />
        ))}
      </span>
      <span className="flex items-center gap-1 text-xs font-semibold">
        {active && <Check className="size-3.5 text-primary" strokeWidth={3} />}
        {colors.name}
      </span>
    </button>
  );
}

function SyncCard() {
  const { status, email, lastSyncedAt, error } = useSync();
  const [address, setAddress] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const signedIn = Boolean(email);

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    const supabase = await getSupabase();
    if (!supabase) return;
    setSending(true);
    setProblem(null);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: address.trim(),
      options: { emailRedirectTo: `${window.location.origin}/settings` },
    });
    setSending(false);
    if (authError) setProblem(authError.message);
    else setSent(true);
  }

  async function signOut() {
    const supabase = await getSupabase();
    await supabase?.auth.signOut();
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Sync</h2>
      <Card className="p-4">
        {signedIn ? (
          <>
            <p className="flex items-center gap-2 font-medium">
              {status === "error" ? (
                <CloudOff className="size-5 text-danger" />
              ) : status === "syncing" ? (
                <Loader2 className="size-5 animate-spin text-muted" />
              ) : (
                <Cloud className="size-5 text-primary" />
              )}
              Signed in as {email}
            </p>
            <p className="mt-1 text-sm text-muted">
              {status === "error"
                ? `Sync problem: ${error}`
                : status === "syncing"
                  ? "Syncing…"
                  : lastSyncedAt
                    ? `Progress saved to the cloud at ${new Date(lastSyncedAt).toLocaleTimeString()}.`
                    : "Your progress is saved to the cloud."}
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={signOut}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </>
        ) : sent ? (
          <p className="flex items-start gap-2 text-[15px] leading-relaxed">
            <Mail className="mt-0.5 size-5 shrink-0 text-primary" />
            Check your inbox. We sent a sign-in link to {address}. Open it on this device.
          </p>
        ) : (
          <form onSubmit={sendLink} className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-muted">
              Optional. Sign in with your email to back up your progress and use it on more than one device. No
              password — we email you a link.
            </p>
            <Input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              aria-label="Email address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            {problem && <p className="text-sm text-danger">{problem}</p>}
            <Button type="submit" disabled={sending}>
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              Email me a sign-in link
            </Button>
          </form>
        )}
      </Card>
    </section>
  );
}

export default function SettingsPage() {
  const settings = useSettings();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Settings" back="/" />

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Appearance</h2>
        <Card className="overflow-hidden">
          <Row
            icon={settings.theme === "dark" ? Moon : Sun}
            title="Dark mode"
            text={settings.theme === "dark" ? "Easy on the eyes" : "Light mode is on"}
          >
            <Switch
              checked={settings.theme === "dark"}
              onCheckedChange={(on) => settings.setTheme(on ? "dark" : "light")}
              aria-label="Dark mode"
              data-testid="theme-switch"
            />
          </Row>
          <Row icon={Grid3x3} title="Board coordinates" text="Show a–h and 1–8 on the board">
            <Switch
              checked={settings.coordinates}
              onCheckedChange={settings.setCoordinates}
              aria-label="Board coordinates"
              data-testid="coordinates-switch"
            />
          </Row>
          <Row
            icon={settings.muted ? VolumeX : Volume2}
            title="Sounds"
            text={settings.muted ? "Muted" : "Move, capture and check sounds"}
          >
            <Switch
              checked={!settings.muted}
              onCheckedChange={(on) => {
                settings.setMuted(!on);
                if (on) setTimeout(() => playSound("move"), 0);
              }}
              aria-label="Sounds"
              data-testid="sound-switch"
            />
          </Row>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Board colours</h2>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(BOARD_THEMES) as BoardTheme[]).map((theme) => (
            <BoardSwatch
              key={theme}
              theme={theme}
              active={settings.boardTheme === theme}
              onSelect={() => settings.setBoardTheme(theme)}
            />
          ))}
        </div>
      </section>

      {supabaseConfigured && <SyncCard />}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Install on iPhone</h2>
        <Card className="p-4">
          <ol className="flex flex-col gap-2.5 text-[15px] leading-relaxed">
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">1</span>
              <span>Open this page in Safari.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">2</span>
              <span>
                Tap the Share button <Share className="inline size-4 align-text-bottom" /> at the bottom of the screen.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">3</span>
              <span>Choose “Add to Home Screen”, then tap Add.</span>
            </li>
          </ol>
          <p className="mt-3 text-sm text-muted">
            After that, OpeningsPro opens full-screen like a normal app and works without an internet connection.
          </p>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">About</h2>
        <Card className="p-4 text-sm leading-relaxed text-muted">
          <p>
            Your progress is stored on this device{supabaseConfigured ? " and, if you sign in, in your account" : ""}.
          </p>
          <p className="mt-2">
            Opening names and puzzles come from the Lichess open database (CC0). Lessons, traps and mating patterns
            were written for this app and checked move by move.
          </p>
        </Card>
      </section>
    </div>
  );
}
