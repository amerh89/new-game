"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Crown, GraduationCap, Home, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Home, match: ["/", "/progress", "/settings", "/repertoire"] },
  { href: "/library", label: "Library", icon: BookOpen, match: ["/library", "/explore"] },
  { href: "/train", label: "Train", icon: GraduationCap, match: ["/train"] },
  { href: "/quiz", label: "Quiz", icon: Lightbulb, match: ["/quiz"] },
  { href: "/mates", label: "Mates", icon: Crown, match: ["/mates"] },
];

function isActive(pathname: string, match: string[]) {
  return match.some((m) => (m === "/" ? pathname === "/" : pathname === m || pathname.startsWith(`${m}/`)));
}

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 pb-safe backdrop-blur-xl"
    >
      <ul className="mx-auto grid h-16 max-w-xl grid-cols-5 px-1">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = isActive(pathname, match);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors",
                  active ? "text-primary" : "text-muted",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute top-0 h-0.5 w-10 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
