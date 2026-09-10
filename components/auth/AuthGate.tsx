"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

/**
 * Replacements for Clerk SignedIn / SignedOut.
 *
 * Both render NOTHING until the session resolves. Treating an unresolved
 * session as signed-out makes the marketing page flash "Get started free" at
 * somebody who is already signed in, then swap it for "Go to dashboard" a
 * moment later -- which reads as a bug on the very first screen anyone sees.
 */
export function SignedIn({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded || !isSignedIn) return null;
  return <>{children}</>;
}

export function SignedOut({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded || isSignedIn) return null;
  return <>{children}</>;
}
