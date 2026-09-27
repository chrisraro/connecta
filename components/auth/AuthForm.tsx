"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { forgotPasswordHref } from "@/lib/authRecovery";
import { googleRedirectTo } from "@/lib/oauth";
import { Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlanPanel } from "@/components/survey/PlanPanel";
import { toUserMessage } from "@/lib/errors";

type Props = {
  mode: "signin" | "signup";
  /** Where to land after a successful sign-in. Always same-origin. */
  redirectUrl: string;
  /** Present when the visitor arrived by tapping or scanning a physical card. */
  cardUuid?: string;
};

/**
 * Email and password auth against Supabase.
 *
 * Replaces the Clerk drop-in components. The chrome around it is unchanged --
 * this is only the form itself, so the page keeps its layout, brand mark and
 * feature strip.
 */
export function AuthForm({ mode, redirectUrl, cardUuid }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const isSignIn = mode === "signin";

  // Google hands back to /auth/callback, which handles admins, tapped cards
  // and new accounts exactly as it does for email sign-in.
  async function continueWithGoogle() {
    setBusy(true);
    setError(null);
    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: googleRedirectTo(window.location.origin, redirectUrl) },
    });
    // On success the browser is already leaving for Google.
    if (oauthError) {
      setError(toUserMessage(oauthError));
      setBusy(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();

    try {
      if (isSignIn) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;

        // A full navigation, not router.push: the session cookie was just set
        // by the auth client, and the callback route has to be reached by the
        // server with that cookie attached in order to read it.
        window.location.assign(redirectUrl);
        return;
      }

      const emailRedirectTo = new URL(redirectUrl, window.location.origin).toString();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo,
          // Read by the handle_new_user trigger to populate users.name, so the
          // dashboard has something to greet the person with immediately.
          data: { full_name: fullName.trim() || null },
        },
      });
      if (signUpError) throw signUpError;

      // With email confirmation enabled Supabase returns a user but NO session.
      // Redirecting in that state lands on a protected page with no auth and
      // bounces straight back here, which reads as the signup having failed.
      if (!data.session) {
        setCheckEmail(true);
        return;
      }

      window.location.assign(redirectUrl);
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (checkEmail) {
    return (
      <PlanPanel heading="Confirm your email" level={1}>
        <div className="flex gap-3">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-[15px] leading-relaxed">
            We sent a confirmation link to <span className="font-semibold">{email}</span>. Open it
            on this device and you will be signed in automatically; on another device, open it there
            and then sign in here.
            {cardUuid ? " Your card will be linked once you are in." : ""}
          </p>
        </div>
      </PlanPanel>
    );
  }

  return (
    <PlanPanel heading={isSignIn ? "Welcome back" : "Create your account"} level={1}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-[15px] text-muted-foreground">
          {isSignIn ? "Sign in to manage your card." : "A few seconds and your card is live."}
        </p>

        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={continueWithGoogle}
          className="h-12 w-full gap-3 text-[15px] font-semibold"
        >
          <GoogleG />
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-[13px] text-muted-foreground" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          or with email
          <span className="h-px flex-1 bg-border" />
        </div>

        {!isSignIn && (
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-[14px] font-semibold">
              Full name
            </Label>
            <Input
              id="fullName"
              name="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan dela Cruz"
              className="h-12 text-[15px]"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[14px] font-semibold">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-12 text-[15px]"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="password" className="text-[14px] font-semibold">
              Password
            </Label>
            {isSignIn && (
              <Link
                href={forgotPasswordHref(cardUuid)}
                className="text-[14px] font-semibold text-primary underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isSignIn ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSignIn ? "Your password" : "At least 8 characters"}
            className="h-12 text-[15px]"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="border-[1.5px] border-destructive px-3 py-2 text-[14px] font-medium text-destructive"
          >
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy} className="h-12 w-full text-[15px] font-bold">
          {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isSignIn ? "Sign In" : "Create Account"}
        </Button>
      </form>
    </PlanPanel>
  );
}

/** Google's "G" in its own colours, as Google's sign-in branding requires. */
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
