"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2 } from "lucide-react";

/**
 * Dashboard Layout with Role-Based Redirect
 * Automatically redirects:
 * - Admins → /admin/dashboard (if they land on /dashboard)
 * - Non-admins → /dashboard (if they land on /admin/*)
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  // Check admin status
  const adminStatus = useQuery(
    api.admin.checkAdminStatus,
    isLoaded && user ? { clerkId: user.id } : "skip"
  );

  useEffect(() => {
    if (!isLoaded || !adminStatus) return;

    const isAdmin = adminStatus.isAdmin;
    const isOnUserDashboard = pathname?.startsWith("/dashboard");
    const isOnAdminDashboard = pathname?.startsWith("/admin");

    // If admin tries to access user dashboard, redirect to admin dashboard
    if (isAdmin && isOnUserDashboard && pathname !== "/dashboard/onboarding") {
      console.log("Admin detected on user dashboard, redirecting to admin...");
      router.replace("/admin/dashboard");
      return;
    }

    // If non-admin tries to access admin dashboard, redirect to user dashboard
    if (!isAdmin && isOnAdminDashboard) {
      console.log("Non-admin detected on admin dashboard, redirecting to user...");
      router.replace("/dashboard");
      return;
    }
  }, [isLoaded, adminStatus, pathname, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
      </div>
    );
  }

  return <>{children}</>;
}
