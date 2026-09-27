import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Step 9 (skippable, invited users only): create a password so a
 * team-invite account can also sign in with email, not just the method the
 * invite arrived through. Saved via supabase.auth.updateUser({ password }),
 * validated with the same rules as lib/authRecovery.ts passwordProblem.
 */
export function PasswordStep({
  password,
  confirm,
  error,
  onPasswordChange,
  onConfirmChange,
}: {
  password: string;
  confirm: string;
  error: string | null;
  onPasswordChange: (v: string) => void;
  onConfirmChange: (v: string) => void;
}) {
  return (
    <div className="flex-1 space-y-4 pt-4">
      <p className="text-sm text-muted-foreground">
        Create a password so you can also sign in with your email, not just the way you were
        invited. Leave this blank to skip.
      </p>
      <div className="space-y-2">
        <Label>New password</Label>
        <Input
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <Label>Confirm password</Label>
        <Input
          type="password"
          placeholder="Retype your password"
          value={confirm}
          onChange={(e) => onConfirmChange(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
