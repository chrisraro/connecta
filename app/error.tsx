"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, RotateCw } from "lucide-react";
import { ConnectaMark } from "@/components/brand/ConnectaMark";
import { CONNECTA } from "@/lib/brand";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for observability without leaking details to the UI.
    console.error(error);
  }, [error]);

  return (
    <div className="sheet-grid relative flex min-h-screen flex-col items-center justify-center px-6 text-center text-foreground">

      <Link href="/" className="mb-10 flex items-center gap-2.5">
        <ConnectaMark className="h-7 w-7 text-primary" />
        <span className="text-[15px] font-bold tracking-[0.1em] [font-stretch:125%]">
          {CONNECTA.name.toUpperCase()}
        </span>
      </Link>

      <h1 className="flex items-center gap-2.5 text-2xl font-bold [font-stretch:112%] sm:text-3xl">
        {/* The status mark: red is reserved for exactly this. */}
        <span aria-hidden="true" className="h-3 w-3 rounded-full bg-[var(--connecta-mark)]" />
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        An unexpected error occurred. You can try again, or head back to safety.
      </p>
      {error?.digest && (
        <p className="mt-2 font-mono text-xs text-muted-foreground/70">Ref: {error.digest}</p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => reset()} className="h-12 px-7">
          <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
        <Link href="/">
          <Button variant="outline" className="h-12 px-7">
            <Home className="mr-2 h-4 w-4" aria-hidden="true" />
            Back home
          </Button>
        </Link>
      </div>
    </div>
  );
}
