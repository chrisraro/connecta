"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useIsAdmin } from "@/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  LayoutDashboard,
  Users,
  SmartphoneNfc,
  LogOut,
  Menu,
  FileText,
  Settings,
  ShoppingCart,
  Package,
  Tags,
  TrendingUp,
} from "lucide-react";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ConnectaMark } from "@/components/brand/ConnectaMark";
import { CONNECTA } from "@/lib/brand";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname(); // Move hooks BEFORE any conditional returns
  const { user, isLoaded, isSignedIn } = useAuth();

  const signOut = async () => {
    await createClient().auth.signOut();
    // Full navigation, not a client transition: the session cookie has just
    // been cleared and middleware must see that on the next request.
    window.location.assign("/");
  };

  /*
      This shell gates on the `admins` table, not on users.role.

      Those are two different admin systems, and they drifted: nothing ever
      wrote users.role, so a legitimate superadmin with a real `admins` row
      still rendered the console unreachable. is_admin() reads the same table
      the RLS policies read, so the shell and the data layer cannot disagree.

      It is also unspoofable by construction -- is_admin() takes its identity
      from auth.uid(), the verified JWT subject, not from anything the client
      passes in.

      NOTE: this is the third of three gates, and the weakest by design. The
      middleware refuses /admin without an admin grant, and every admin table
      is behind an is_admin() policy, so no admin DATA is reachable regardless
      of what shell renders here.
  */
  const { data: isAdmin, isPending: adminPending } = useIsAdmin();

  // No syncUser: public.users is created by a trigger on auth.users, so there
  // is no client-side mirror that can fail and leave the console unreachable.
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  const verifiedAdmin = adminPending ? null : Boolean(isAdmin);

  useEffect(() => {
    if (verifiedAdmin === false) {
      router.push("/dashboard"); // Kick out non-admins
    }
  }, [verifiedAdmin, router]);

  if (!isLoaded || verifiedAdmin === null) {
    return (
      <div className="dark h-screen w-full flex items-center justify-center bg-background text-foreground">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
      </div>
    );
  }

  // We rely purely on `verifiedAdmin` which waits for DB sync. No more white-screen blocks.

  type NavItem = {
    href?: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    children?: NavItem[];
  };

  const navItems: NavItem[] = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/factory", label: "NFC Factory", icon: SmartphoneNfc },
    {
      label: "Shop",
      icon: ShoppingCart,
      children: [
        { href: "/admin/shop/products", label: "Products", icon: Package },
        { href: "/admin/shop/categories", label: "Categories", icon: Tags },
        { href: "/admin/shop/inventory", label: "Inventory", icon: TrendingUp },
      ],
    },
    { href: "/admin/audit", label: "Audit Logs", icon: FileText },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="dark flex flex-col md:flex-row min-h-screen bg-background text-foreground">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b-[1.5px] border-input bg-background sticky top-0 z-40">
        <Link href="/admin" className="flex items-center gap-2.5">
          <ConnectaMark className="h-7 w-7 text-primary" />
          <span className="text-[15px] font-bold tracking-[0.1em] [font-stretch:125%]">
            {CONNECTA.name.toUpperCase()}
          </span>
          {/* Red is reserved for status; being in the staff console is one. */}
          <span className="border-[1.5px] border-[var(--connecta-mark)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--connecta-mark-text)]">
            Admin
          </span>
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="bg-background border-border text-foreground w-72 p-0"
          >
            {/*
                          Radix requires every DialogContent (which SheetContent
                          is) to have a DialogTitle, or it logs an accessibility
                          error and screen-reader users get an unlabelled dialog.
                          This brand line already WAS the visual title — it was
                          just a plain <div>, so it never registered as the
                          accessible name. SheetHeader/SheetTitle were imported
                          but unused.
                        */}
            <SheetHeader className="p-6 border-b border-border space-y-0">
              <SheetTitle className="flex items-center gap-2.5">
                <ConnectaMark className="h-7 w-7 text-primary" />
                <span className="text-[15px] font-bold tracking-[0.1em] [font-stretch:125%]">
                  {CONNECTA.name.toUpperCase()}
                </span>
                {/* Red is reserved for status; being in the staff console is one. */}
                <span className="border-[1.5px] border-[var(--connecta-mark)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--connecta-mark-text)]">
                  Admin
                </span>
              </SheetTitle>
            </SheetHeader>
            <nav className="p-4 space-y-2">
              {navItems.map((item) => {
                if ("children" in item) {
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground">
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      <div className="ml-7 space-y-1">
                        {item.children?.map((child) => (
                          <Link key={child.href} href={child.href!}>
                            <Button
                              variant={pathname === child.href ? "secondary" : "ghost"}
                              className={cn(
                                "w-full justify-start gap-2 text-sm",
                                pathname === child.href
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : "text-muted-foreground hover:text-foreground hover:bg-card",
                              )}
                            >
                              <child.icon className="w-4 h-4" />
                              {child.label}
                            </Button>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                }
                if (!item.href) return null;
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                        pathname === item.href
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-card",
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start min-h-11 text-muted-foreground hover:text-foreground"
                onClick={() => router.push("/dashboard")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
                Back to user app
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start min-h-11 text-muted-foreground hover:text-destructive"
                onClick={() => signOut()}
              >
                <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
                Sign out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Admin Sidebar (Desktop) */}
      <aside className="sticky top-0 h-screen w-64 shrink-0 overflow-y-auto bg-background border-r-[1.5px] border-input hidden md:flex flex-col">
        <Link href="/admin" className="p-6 flex items-center gap-2.5">
          <ConnectaMark className="h-7 w-7 text-primary" />
          <span className="text-[15px] font-bold tracking-[0.1em] [font-stretch:125%]">
            {CONNECTA.name.toUpperCase()}
          </span>
          {/* Red is reserved for status; being in the staff console is one. */}
          <span className="border-[1.5px] border-[var(--connecta-mark)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--connecta-mark-text)]">
            Admin
          </span>
        </Link>

        <p className="px-6 text-[13px] font-semibold text-muted-foreground">Super User Control</p>

        <nav className="flex-1 px-4 space-y-2 py-4">
          {navItems.map((item) => {
            if ("children" in item) {
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center gap-3 px-4 py-2 text-[13px] font-semibold text-muted-foreground">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  <div className="ml-4 space-y-1">
                    {item.children?.map((child) => (
                      <Link key={child.href} href={child.href!}>
                        <div
                          className={cn(
                            "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            pathname === child.href
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-card",
                          )}
                        >
                          <child.icon className="h-4 w-4" />
                          {child.label}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <Link key={item.href} href={item.href!}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-card",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-border space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start min-h-11 text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            Back to user app
          </Button>
          {/*
                      Distinct from "Back to user app": that keeps the session
                      and just navigates. Signing out is what lets you re-enter
                      as a different (non-admin) account to check the consumer
                      dashboard — previously impossible from inside /admin.
                    */}
          <Button
            variant="ghost"
            className="w-full justify-start min-h-11 text-muted-foreground hover:text-destructive"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="sheet-grid flex-1 min-w-0 p-4 md:p-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Bar */}
      <nav aria-label="Admin" className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t-[1.5px] border-input flex items-center justify-around px-2 z-40">
        {navItems
          .filter((item) => !("children" in item))
          .slice(0, 4)
          .map((item) => (
            <Link
              key={item.href}
              href={item.href!}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full"
            >
              <item.icon
                className={cn(
                  "h-5 w-5",
                  pathname === item.href ? "text-foreground" : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "text-[12px] font-bold",
                  pathname === item.href ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label.split(" ")[0]}
              </span>
            </Link>
          ))}
      </nav>
    </div>
  );
}
