import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

/**
 * Refreshes the Supabase session cookie on every matched request.
 *
 * This is not optional plumbing. Supabase access tokens are short-lived; if
 * nothing refreshes them, a signed-in user is silently signed out mid-session
 * and Server Components start seeing no user at all. Middleware is the only
 * place that can both read the incoming cookies and write refreshed ones back
 * on the response.
 *
 * Returns BOTH the response and the resolved user so the caller can make
 * routing decisions without a second round trip to the auth server.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser(), NOT getSession(). getSession reads the cookie and trusts it;
  // getUser revalidates the token against the auth server. In middleware --
  // the component deciding whether to let a request through -- trusting an
  // unverified cookie is the difference between a session check and a
  // decoration.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
