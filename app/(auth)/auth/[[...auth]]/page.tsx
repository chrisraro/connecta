import { SignIn, SignUp } from '@clerk/nextjs';
import { ArrowLeft, Loader2, Sparkles, ShieldCheck, Zap, SmartphoneNfc } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { ConnectaMark } from '@/components/brand/ConnectaMark';
import { CONNECTA } from '@/lib/brand';

export default function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; card_uuid?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
        </div>
      }
    >
      <AuthContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AuthContent({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; card_uuid?: string }>;
}) {
  const params = await searchParams;
  const mode = params.mode;
  const cardUuid = params.card_uuid;

  const isSignIn = mode === 'signin';

  // Build redirect URL - always route to callback which redirects to /dashboard (or /admin).
  // card_uuid MUST ride along: the QR on a physical card lands on
  // /t/<uuid> -> here, and the only consumer that actually claims the card
  // (onboarding's claimCardByUuid effect) sits on the far side of Clerk's
  // redirect. Dropping the param here silently severed the whole QR
  // activation path — users scanned, signed up, and nothing happened.
  const redirectUrl = cardUuid
    ? `/auth/callback?card_uuid=${encodeURIComponent(cardUuid)}`
    : '/auth/callback';

  // Build auth URLs preserving card_uuid when toggling sign-in vs sign-up
  const signUpUrl = cardUuid
    ? `/auth?mode=signup&card_uuid=${encodeURIComponent(cardUuid)}`
    : '/auth?mode=signup';

  const signInUrl = cardUuid
    ? `/auth?mode=signin&card_uuid=${encodeURIComponent(cardUuid)}`
    : '/auth?mode=signin';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground relative overflow-hidden px-4 py-12 selection:bg-yellow-500/30">
      {/* 2026 Trend Ambient Background Glow Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[140%] bg-gradient-to-br from-yellow-500/15 via-amber-500/5 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[90%] bg-gradient-to-tl from-yellow-500/10 via-primary/5 to-transparent blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Brand Branding & Header */}
        <div className="w-full text-center mb-6 space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-3xl bg-primary/10 border border-primary/20 shadow-xl mb-1">
            <ConnectaMark className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {CONNECTA.name}
          </h1>
          <p className="text-xs text-muted-foreground font-medium max-w-xs mx-auto leading-relaxed">
            Elevate your digital business card, manage leads CRM &amp; share via NFC instantly.
          </p>

          {cardUuid && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold mt-2">
              <SmartphoneNfc className="w-3.5 h-3.5" />
              NFC Hardware Card Linked
            </div>
          )}
        </div>

        {/* Mode Switcher Pills */}
        <div className="flex bg-muted/80 p-1 rounded-2xl border border-border/80 w-full mb-6 shadow-sm">
          <Link
            href={signInUrl}
            className={`flex-1 py-2 text-xs font-bold rounded-xl text-center transition-all ${
              isSignIn
                ? "bg-background text-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </Link>
          <Link
            href={signUpUrl}
            className={`flex-1 py-2 text-xs font-bold rounded-xl text-center transition-all ${
              !isSignIn
                ? "bg-background text-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create Account
          </Link>
        </div>

        {/* Auth Form Box with 2026 Trend Design System Styling */}
        <div className="w-full">
          {isSignIn ? (
            <SignIn
              routing="hash"
              forceRedirectUrl={redirectUrl}
              fallbackRedirectUrl="/dashboard"
              signUpUrl={signUpUrl}
              appearance={{
                elements: {
                  card: "bg-card/80 backdrop-blur-2xl border border-border/80 shadow-2xl rounded-3xl p-6 sm:p-8",
                  headerTitle: "text-lg font-bold text-foreground",
                  headerSubtitle: "text-xs text-muted-foreground",
                  formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs py-3 transition-all shadow-md hover:shadow-lg",
                  socialButtonsBlockButton: "border border-border bg-background/90 hover:bg-muted font-semibold text-xs rounded-xl py-2.5 transition-all",
                  formFieldInput: "bg-background border border-border rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/40",
                  footerActionLink: "text-primary hover:underline font-semibold text-xs",
                },
              }}
            />
          ) : (
            <SignUp
              routing="hash"
              forceRedirectUrl={redirectUrl}
              fallbackRedirectUrl="/dashboard"
              signInUrl={signInUrl}
              appearance={{
                elements: {
                  card: "bg-card/80 backdrop-blur-2xl border border-border/80 shadow-2xl rounded-3xl p-6 sm:p-8",
                  headerTitle: "text-lg font-bold text-foreground",
                  headerSubtitle: "text-xs text-muted-foreground",
                  formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs py-3 transition-all shadow-md hover:shadow-lg",
                  socialButtonsBlockButton: "border border-border bg-background/90 hover:bg-muted font-semibold text-xs rounded-xl py-2.5 transition-all",
                  formFieldInput: "bg-background border border-border rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/40",
                  footerActionLink: "text-primary hover:underline font-semibold text-xs",
                },
              }}
            />
          )}
        </div>

        {/* Feature Highlights */}
        <div className="w-full grid grid-cols-3 gap-2 mt-6 text-center">
          <div className="p-2.5 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-sm">
            <Zap className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
            <span className="text-[10px] font-bold text-foreground block">Fast Setup</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
            <span className="text-[10px] font-bold text-foreground block">Encrypted</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <span className="text-[10px] font-bold text-foreground block">NFC Powered</span>
          </div>
        </div>

        {/* Exit Link */}
        <div className="w-full mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
