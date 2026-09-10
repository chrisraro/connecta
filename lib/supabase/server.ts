import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Server-side Supabase client for Server Components, Route Handlers and
 * Server Actions.
 *
 * Still the publishable key, still bound by RLS -- being on the server does
 * not grant extra authority here, and that is deliberate. Server code that
 * needs to bypass RLS must reach for createServiceClient below and say so.
 *
 * cookies() is async in Next 16, so this function is async too.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Harmless: middleware refreshes the session on every request, so
            // the write that failed here has already happened there. Swallowing
            // it is correct rather than lazy -- see lib/supabase/middleware.ts.
          }
        },
      },
    },
  );
}

/**
 * Service-role client. BYPASSES RLS COMPLETELY.
 *
 * Every row in the database is readable and writable through this client, so
 * it is the one credential that can undo the entire authorization model in a
 * single careless import. Rules:
 *
 *   - server-only, never imported into a Client Component
 *   - the key is SUPABASE_SERVICE_ROLE_KEY, never prefixed NEXT_PUBLIC_
 *   - reach for it only where RLS genuinely cannot express the operation:
 *     the Convex internalMutation equivalents, webhooks with no user session,
 *     and scheduled jobs
 *
 * Throws rather than returning a half-working client when the key is missing,
 * because a silent fallback to the publishable key would look like it worked
 * and then fail later as mysterious empty results.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. This client bypasses RLS and cannot fall back to the publishable key.",
    );
  }
  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
