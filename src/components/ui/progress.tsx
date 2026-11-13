import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–1 */
  value: number;
  tone?: "primary" | "accent" | "danger";
}

function Progress({ value, tone = "primary", className, ...props }: ProgressProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-2", className)}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          tone === "primary" && "bg-primary",
          tone === "accent" && "bg-accent",
          tone === "danger" && "bg-danger",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export { Progress };
