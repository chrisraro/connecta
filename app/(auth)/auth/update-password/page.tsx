"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlanPanel } from "@/components/survey/PlanPanel";
import { passwordProblem } from "@/lib/authRecovery";

/**
 * Step two of a password reset (B5). Reached only with a verified reset
 * link's recovery pass (middleware). Shows whose password is being reset, so
 * someone sent another person's link can tell and sign out.
 */
export default function UpdatePasswordPage() {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [othersStillIn, setOthersStillIn] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const problem = passwordProblem(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; othersSignedOut?: boolean };
      if (!res.ok) throw new Error(body.error ?? "Couldn't save your new password. Try again.");
      if (body.othersSignedOut === false) {
        setOthersStillIn(true);
        setBusy(false);
        return;
      }
      window.location.assign("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't save your new password. Try again.");
      setBusy(false);
    }
  }

  async function notMe() {
    setBusy(true);
    await fetch("/api/auth/update-password", { method: "DELETE" }).catch(() => undefined);
    await createClient().auth.signOut().catch(() => undefined);
    window.location.assign("/auth?mode=signin");
  }

  if (othersStillIn) {
    return (
      <div className="w-full max-w-md">
        <PlanPanel heading="Password changed" level={1}>
          <div className="space-y-5">
            <p role="status" className="text-[15px] leading-relaxed">
              Your new password is saved, but we couldn&apos;t sign out your other devices. Anyone
              still signed in elsewhere stays in until their session ends. To be sure, reset your
              password again in a few minutes.
            </p>
            <Button className="h-12 w-full text-[15px] font-bold" onClick={() => window.location.assign("/dashboard")}>
              Continue to dashboard
            </Button>
          </div>
        </PlanPanel>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <PlanPanel heading="Choose a new password" level={1}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="text-[15px] text-muted-foreground">
            Setting a new password for{" "}
            <span className="font-semibold text-foreground">{user?.email ?? "your account"}</span>.
            You&apos;ll be signed out everywhere else.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[14px] font-semibold">
              New password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="h-12 text-[15px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-[14px] font-semibold">
              Confirm new password
            </Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
            Save new password
          </Button>

          <p className="text-center text-[14px] text-muted-foreground">
            Not your account?{" "}
            <button
              type="button"
              onClick={notMe}
              disabled={busy}
              className="font-semibold text-foreground underline underline-offset-2"
            >
              Sign out
            </button>
          </p>
        </form>
      </PlanPanel>
    </div>
  );
}
