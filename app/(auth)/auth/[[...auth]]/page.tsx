"use client";

import { useSearchParams } from "next/navigation";
import { SignIn, SignUp } from "@clerk/nextjs";
import { SmartphoneNfc, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

// Professional Clerk Appearance optimized for all screen sizes
const clerkAppearance = {
  elements: {
    rootBox: "mx-auto w-full max-w-full sm:max-w-[400px]",
    card: "bg-card/80 dark:bg-card/90 backdrop-blur-3xl border border-border/40 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-8 w-full",
    headerTitle: "text-foreground font-black tracking-tight text-2xl sm:text-3xl mb-1",
    headerSubtitle: "text-muted-foreground font-medium mb-6 text-sm sm:text-base",
    formButtonPrimary: "bg-yellow-500 hover:bg-yellow-500/90 text-black font-bold rounded-2xl h-12 transition-all border-none shadow-lg shadow-yellow-500/20 active:scale-95 text-sm sm:text-base",
    socialButtonsBlockButton: "border-border bg-background/50 hover:bg-muted text-foreground rounded-2xl h-12 transition-all font-bold backdrop-blur-sm text-xs sm:text-sm",
    formFieldInput: "bg-background/50 border-border rounded-2xl h-12 focus:ring-2 focus:ring-yellow-500/20 transition-all backdrop-blur-sm",
    footerActionLink: "text-yellow-500 hover:text-yellow-500/80 font-bold",
    formFieldLabel: "text-foreground font-bold text-[10px] sm:text-xs uppercase tracking-wider mb-2",
    identityPreviewText: "text-foreground",
    identityPreviewEditButtonIcon: "text-yellow-500",
    dividerLine: "bg-border/50",
    dividerText: "text-muted-foreground text-[10px] uppercase font-black tracking-widest",
  },
  layout: {
    shimmer: true,
    socialButtonsPlacement: "bottom" as const,
  },
  variables: {
    colorPrimary: "#eab308", 
    borderRadius: "1rem",
  }
};

function AuthContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");

  // Default to Sign Up if mode is 'signup' or if no mode is specified (as requested)
  const isSignIn = mode === "signin";

  return (
    <div className="w-full max-w-md animate-in fade-in zoom-in slide-in-from-bottom-6 duration-1000 ease-out px-4 py-8">
      <div className="flex flex-col items-center mb-10 sm:mb-12 text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-yellow-500/10 rounded-[1.8rem] sm:rounded-[2.2rem] flex items-center justify-center mb-6 shadow-inner ring-1 ring-yellow-500/20 transition-transform hover:scale-105 duration-500 text-yellow-500">
          <SmartphoneNfc className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-4 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent leading-[1.1]">
            TapFolio
        </h1>
        <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-[10px] max-w-[280px] sm:max-w-[300px] leading-relaxed opacity-80">
            Digital Business Card • Lead CRM • NFC Hardware
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full overflow-hidden">
        {isSignIn ? (
          <SignIn 
            appearance={clerkAppearance} 
            routing="hash"
            fallbackRedirectUrl="/dashboard"
            signUpUrl="/auth?mode=signup"
          />
        ) : (
          <SignUp 
            appearance={clerkAppearance} 
            routing="hash"
            fallbackRedirectUrl="/dashboard"
            signInUrl="/auth?mode=signin"
          />
        )}
      </div>

      <div className="mt-10 sm:mt-12 text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-yellow-500 transition-all group py-2">
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-1.5 transition-transform duration-300" />
          Exit to Homepage
        </Link>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="flex items-center justify-center w-full min-h-[85vh]">
        <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-12 h-12 animate-spin text-yellow-500/50" /></div>}>
            <AuthContent />
        </Suspense>
    </div>
  );
}
