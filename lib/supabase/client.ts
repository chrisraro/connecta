import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Browser-side Supabase client.
 *
 * Uses the PUBLISHABLE key, which is designed to ship to browsers: it carries
 * no authority of its own, and every request it makes is filtered by RLS
 * against the caller identity in the session cookie. The service-role key must
 * never appear in this file or any other file reachable from client code -- it
 * bypasses RLS entirely and would void the whole authorization design.
 *
 * Safe to call repeatedly: createBrowserClient returns a singleton per browser
 * context, so components do not each get their own connection.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
