"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Settings, User as UserIcon, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Avatar menu replacing the Clerk UserButton.
 *
 * Clerk shipped this as a hosted widget; Supabase Auth has no UI layer, so the
 * account menu is ours. That is a net gain here -- it now renders in the
 * product design system rather than an iframe-styled approximation of it.
 */
export function UserMenu({ className }: { className?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: appUser } = useCurrentUser();
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  const displayName = appUser?.name || user.email || "Account";
  const initial = (appUser?.name || user.email || "?").charAt(0).toUpperCase();

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // A full navigation, not router.push: the session cookie has just been
    // cleared and middleware has to see that on the next request. A client
    // transition would keep rendering the cached signed-in tree.
    window.location.assign("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className={
          className ??
          "w-9 h-9 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-sm flex items-center justify-center hover:bg-primary/20 transition-colors"
        }
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">
          <span className="block text-xs font-semibold">{displayName}</span>
          {appUser?.email && (
            <span className="block text-[11px] font-normal text-muted-foreground truncate">
              {appUser.email}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/profiles" className="cursor-pointer">
            <UserIcon className="w-4 h-4 mr-2" />
            My profiles
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings" className="cursor-pointer">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={signingOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          {signingOut ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4 mr-2" />
          )}
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { UserMenu as UserButton };
