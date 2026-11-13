import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-3xl bg-surface-2 text-muted">
        <WifiOff className="size-8" />
      </div>
      <h1 className="text-2xl font-bold">You are offline</h1>
      <p className="max-w-xs text-muted">
        That page has not been saved on this device yet. Everything else in OpeningsPro still works.
      </p>
      <Button asChild>
        <Link href="/">Go to the home screen</Link>
      </Button>
    </div>
  );
}
