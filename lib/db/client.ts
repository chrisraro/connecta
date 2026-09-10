"use client";

import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Memoised browser Supabase client for hooks.
 *
 * createClient is already a per-context singleton, so this is about referential
 * stability: a fresh object identity on every render would change the identity
 * of every useCallback and useEffect dependency that closes over it.
 */
export function useSupabase() {
  return useMemo(() => createClient(), []);
}
