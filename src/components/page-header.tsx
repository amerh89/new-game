"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Where the back button goes. Omit for top-level screens. */
  back?: string | true;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, back, actions, className }: PageHeaderProps) {
  const router = useRouter();
  const backClass =
    "-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-surface-2";
  return (
    <header className={cn("flex min-h-14 items-center gap-1 py-2", className)}>
      {back === true && (
        <button type="button" aria-label="Back" className={backClass} onClick={() => router.back()}>
          <ChevronLeft className="size-6" />
        </button>
      )}
      {typeof back === "string" && (
        <Link href={back} aria-label="Back" className={backClass}>
          <ChevronLeft className="size-6" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className={cn("truncate font-bold tracking-tight", back ? "text-lg" : "text-2xl")}>{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}
