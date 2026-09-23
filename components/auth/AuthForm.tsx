"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <div className="bg-card/80 backdrop-blur-2xl border border-border/80 shadow-2xl rounded-3xl p-6 sm:p-8 text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <Mail className="w-6 h-6 text-emerald-500" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Confirm your email</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          We sent a confirmation link to <span className="font-semibold">{email}</span>. Open it on
          this device and you will be signed in automatically; on another device, open it there and
          then sign in here.
          {cardUuid ? " Your card will be linked once you are in." : ""}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card/80 backdrop-blur-2xl border border-border/80 shadow-2xl rounded-3xl p-6 sm:p-8 space-y-4"
    >
      <div className="space-y-1 text-center mb-2">
        <h2 className="text-lg font-bold text-foreground">
          {isSignIn ? "Welcome back" : "Create your account"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {isSignIn ? "Sign in to manage your card." : "A few seconds and your card is live."}
        </p>
      </div>

      {!isSignIn && (
        <div className="space-y-1.5">
          <Label htmlFor="fullName" className="text-xs font-semibold">
            Full name
          </Label>
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Juan dela Cruz"
            className="rounded-xl text-xs"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-semibold">
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
          className="rounded-xl text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-xs font-semibold">
          Password
        </Label>
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
          className="rounded-xl text-xs"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2"
        >
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl font-bold text-xs py-3 shadow-md hover:shadow-lg"
      >
        {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {isSignIn ? "Sign In" : "Create Account"}
      </Button>
    </form>
  );
}
