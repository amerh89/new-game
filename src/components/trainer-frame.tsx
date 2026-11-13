"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Progress } from "@/components/ui/progress";

/** Slim header for focused screens: close button, title, progress bar. */
export function TrainerHeader({
  title,
  subtitle,
  progress,
  closeHref,
  actions,
}: {
  title: string;
  subtitle?: string;
  /** 0–1, omit to hide the bar. */
  progress?: number;
  closeHref: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2 py-2">
      <div className="flex min-h-11 items-center gap-1">
        <Link
          href={closeHref}
          aria-label="Close"
          className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-surface-2"
        >
          <X className="size-6" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {progress !== undefined && <Progress value={progress} className="h-1.5" />}
    </header>
  );
}
