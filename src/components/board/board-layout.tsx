import { cn } from "@/lib/utils";

/**
 * Board on top with the panel underneath on phones;
 * board on the left with the panel beside it on wide screens.
 */
export function BoardLayout({
  board,
  children,
  className,
}: {
  board: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("lg:grid lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:items-start lg:gap-8", className)}>
      <div className="bleed sm:mx-0 lg:sticky lg:top-4">{board}</div>
      <div className="mt-3 flex min-w-0 flex-col gap-3 lg:mt-0">{children}</div>
    </div>
  );
}
