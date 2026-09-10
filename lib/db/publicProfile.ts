import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type PublicProfile = Tables<"profiles">;

/**
 * Server-side reads for the public profile pages.
 *
 * Uses the ordinary server client, NOT the service role. With no session the
 * request authenticates as `anon`, which is exactly the identity a stranger
 * tapping a card has -- so these pages exercise the same policy real visitors
 * do, and a profile hidden by profiles_select_anon (a suspended owner) is
 * hidden here too rather than being rendered by a privileged read.
 *
 * Returns null rather than throwing: a missing profile is a 404, not an error,
 * and both call sites want to notFound() on it.
 */
export async function getProfileBySlug(slug: string): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("slug", slug)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function getProfileById(id: string): Promise<PublicProfile | null> {
  // A malformed id would make Postgres reject the whole query on the uuid
  // cast. Callers pass a path segment, so this is reachable from the address
  // bar; short-circuiting keeps it a 404 rather than a 500.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) return null;
  return data;
}
