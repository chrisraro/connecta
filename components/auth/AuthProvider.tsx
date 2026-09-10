"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthState = {
  /** The Supabase auth user, or null when signed out. */
  user: User | null;
  /** False until the first auth state resolution completes. */
  isLoaded: boolean;
  isSignedIn: boolean;
};

const AuthContext = createContext<AuthState>({
  user: null,
  isLoaded: false,
  isSignedIn: false,
});

/**
 * Supabase session state for client components.
 *
 * Deliberately shaped like the Clerk useUser() it replaces -- { user, isLoaded,
 * isSignedIn } -- so the call sites port by changing the import rather than
 * being rewritten. The meaningful difference is that user.id is now the
 * Postgres uuid that every RLS policy compares against auth.uid(), so it can be
 * used directly as an owner id instead of being translated through a clerkId
 * lookup.
 *
 * isLoaded matters as much as user. Treating a not-yet-resolved session as
 * signed out makes every protected page flash its signed-out state on load.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setIsLoaded(true);
    });

    // Fires on sign-in, sign-out, token refresh and cross-tab changes, so a
    // sign-out in another tab is reflected here rather than leaving this tab
    // rendering a signed-in shell over a dead session.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setIsLoaded(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, isLoaded, isSignedIn: Boolean(user) }),
    [user, isLoaded],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Alias easing the port from Clerk, whose hook had this name. */
export const useUser = useAuth;
