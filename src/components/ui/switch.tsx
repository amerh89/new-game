"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full bg-surface-2 transition-colors data-[state=checked]:bg-primary",
        // A larger invisible hit area keeps the control at 44px+ for thumbs.
        "before:absolute before:-inset-2 before:content-['']",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-6 translate-x-1 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-7" />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
