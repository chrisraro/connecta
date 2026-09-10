"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/components/auth/AuthProvider";

/**
 * Replaces ConvexClientProvider.
 *
 * Convex useQuery was a live subscription: every read re-rendered on change,
 * with no extra code. Supabase reads are one-shot, so porting call sites 1:1
 * would silently turn every live view into a stale one -- no test catches
 * that, and it surfaces weeks later as "why is my dashboard not updating".
 *
 * TanStack Query is the deliberate replacement: reads are cached and refetched
 * on an explicit policy, and mutations invalidate the keys they affect.
 * Realtime is then added per surface, with a stated reason, rather than being
 * the unexamined default it was under Convex.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  // useState, not a module-level client: on the server a module-level
  // QueryClient is shared across requests, which leaks one user cached data
  // into another user response.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // The data here is personal dashboard state, not a feed. A short
            // stale window keeps it fresh without refetching on every mount.
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
