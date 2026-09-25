"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlanPanel } from "@/components/survey/PlanPanel";
import { toUserMessage } from "@/lib/errors";
import { resetRedirectTo } from "@/lib/authRecovery";

/**
 * Step one of a password reset (B5). The confirmation reads the same whether
 * or not the email has an account, so this form can't be used to find out
 * who is signed up. Supabase rate-limits the emails it sends.
 */
export function ForgotPasswordForm({ signInUrl = "/auth?mode=signin" }: { signInUrl?: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error: resetError } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: resetRedirectTo(window.location.origin),
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <PlanPanel heading="Check your email" level={1}>
        <div className="flex gap-3">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-[15px] leading-relaxed">
            If an account exists for <span className="font-semibold">{email.trim()}</span>, we sent a
            link to reset its password. It expires in an hour. Nothing there? Check spam, or{" "}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="font-semibold underline underline-offset-2"
            >
              try again
            </button>
            .
          </p>
        </div>
      </PlanPanel>
    );
  }

  return (
    <PlanPanel heading="Reset your password" level={1}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-[15px] text-muted-foreground">
          Enter the email you sign in with and we&apos;ll send you a link to choose a new password.
        </p>

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
          Send reset link
        </Button>

        <p className="text-center text-[14px]">
          <Link href={signInUrl} className="font-semibold underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </form>
    </PlanPanel>
  );
}
