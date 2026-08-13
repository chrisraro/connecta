"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2 } from "lucide-react";

/**
 * Post-login redirect component
 * Checks if user is admin and redirects accordingly:
 * - Admins → /admin/dashboard
 * - Regular users → /dashboard
 */
export default function PostLoginRedirect() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  // Check admin status
  const adminStatus = useQuery(
    api.admin.checkAdminStatus,
    isLoaded && user ? { clerkId: user.id } : "skip"
  );

  useEffect(() => {
    if (!isLoaded) return;

    // If admin status check is complete
    if (adminStatus !== undefined && adminStatus !== null) {
      console.log("Admin status:", adminStatus);
      
      if (adminStatus.isAdmin) {
        console.log("Redirecting admin to /admin");
        router.push("/admin");
      } else {
        console.log("Redirecting user to /dashboard");
        router.push("/dashboard");
      }
    }
  }, [isLoaded, adminStatus, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30">
      <Loader2 className="w-10 h-10 animate-spin text-yellow-500 mb-4" />
      <p className="text-sm text-muted-foreground">
        Checking your account...
      </p>
    </div>
  );
}
