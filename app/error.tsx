"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, RotateCw } from "lucide-react";
import { SigmaTapMark } from "@/components/brand/SigmaTapMark";
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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 text-center text-foreground">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/4 -z-10 aspect-square w-[120%] max-w-[640px] -translate-x-1/2 rounded-full bg-destructive/10 blur-[120px]"
      />

      <div className="mb-8 flex items-center gap-2 text-lg font-bold tracking-tight">
        <SigmaTapMark className="h-5 w-5 text-primary" />
        <span>{CONNECTA.name}</span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        An unexpected error occurred. You can try again, or head back to safety.
      </p>
      {error?.digest && (
        <p className="mt-2 font-mono text-xs text-muted-foreground/70">
          Ref: {error.digest}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={() => reset()}
          className="h-12 rounded-2xl px-7 font-semibold"
        >
          <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
        <Link href="/">
          <Button variant="outline" className="h-12 rounded-2xl px-7 font-semibold">
            <Home className="mr-2 h-4 w-4" aria-hidden="true" />
            Back home
          </Button>
        </Link>
      </div>
    </div>
  );
}
