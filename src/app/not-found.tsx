import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-muted">404</p>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="max-w-xs text-muted">That page does not exist. Let&apos;s get you back to the board.</p>
      <Button asChild>
        <Link href="/">Go to the home screen</Link>
      </Button>
    </div>
  );
}
