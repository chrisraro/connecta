import { AuthForm } from "@/components/auth/AuthForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { ArrowLeft, Loader2, ShieldCheck, SmartphoneNfc, Zap } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ConnectaMark } from "@/components/brand/ConnectaMark";
import { CONNECTA } from "@/lib/brand";

const AUTH_NOTICES: Record<string, string> = {
  // The link was verified, but it was opened on a different device or browser
  // from the one that signed up, so the session could not be finished there.
  confirmed: "Your email is confirmed. Sign in to continue.",
  link_invalid:
    "That link has expired or was already used. If you have confirmed your email, sign in; otherwise create your account again to get a new link.",
  // Set by /auth/confirm, /auth/callback?flow=recovery and the reset page's
  // guard when a password reset link can't be used.
  reset_link_invalid:
    "That reset link has expired, was already used, or was opened in a different browser. Enter your email to get a new one.",
};

export default function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; card_uuid?: string; notice?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
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
  searchParams: Promise<{ mode?: string; card_uuid?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const mode = params.mode;
  const cardUuid = params.card_uuid;

  const isForgot = mode === "forgot";
  // "Forgot password" belongs to signing in, so that tab stays selected.
  const isSignIn = mode === "signin" || isForgot;

  // Set by /auth/callback when an email link could not finish signing in.
  // Only known keys render; anything else in the query string is ignored.
  const notice = params.notice ? AUTH_NOTICES[params.notice] : undefined;

  // Build redirect URL - always route to callback which redirects to /dashboard (or /admin).
  // card_uuid MUST ride along: the QR on a physical card lands on
  // /t/<uuid> -> here, and the only consumer that actually claims the card
  // (onboarding's claimCardByUuid effect) sits on the far side of Clerk's
  // redirect. Dropping the param here silently severed the whole QR
  // activation path — users scanned, signed up, and nothing happened.
  const redirectUrl = cardUuid
    ? `/auth/callback?card_uuid=${encodeURIComponent(cardUuid)}`
    : "/auth/callback";

  // Build auth URLs preserving card_uuid when toggling sign-in vs sign-up
  const signUpUrl = cardUuid
    ? `/auth?mode=signup&card_uuid=${encodeURIComponent(cardUuid)}`
    : "/auth?mode=signup";

  const signInUrl = cardUuid
    ? `/auth?mode=signin&card_uuid=${encodeURIComponent(cardUuid)}`
    : "/auth?mode=signin";

  const tab = (active: boolean) =>
    `flex h-11 flex-1 items-center justify-center text-[14px] font-bold [font-stretch:112%] transition-colors ${
      active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
    }`;

  return (
    <div className="flex w-full max-w-md flex-col items-center text-foreground">
      {/* Title block: the mark and wordmark, as on the homepage nav. */}
      <div className="mb-8 w-full text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5"
          aria-label={`${CONNECTA.name} home`}
        >
          <ConnectaMark className="h-9 w-9 text-primary" />
          <span className="text-[19px] font-bold tracking-[0.1em] [font-stretch:125%]">
            {CONNECTA.name.toUpperCase()}
          </span>
        </Link>
        <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-muted-foreground">
          Elevate your digital business card, manage leads CRM &amp; share via NFC instantly.
        </p>

        {cardUuid && (
          <p className="mt-4 inline-flex items-center gap-1.5 border-[1.5px] border-input px-2.5 py-1 text-[13px] font-bold">
            <SmartphoneNfc className="h-4 w-4 text-primary" aria-hidden="true" />
            NFC Hardware Card Linked
          </p>
        )}
      </div>

      {/* Mode switch: two cells on one boundary. */}
      <nav aria-label="Account" className="mb-8 flex w-full border-[1.5px] border-input">
        <Link
          href={signInUrl}
          aria-current={isSignIn ? "page" : undefined}
          className={tab(isSignIn)}
        >
          Sign In
        </Link>
        <Link
          href={signUpUrl}
          aria-current={!isSignIn ? "page" : undefined}
          className={`${tab(!isSignIn)} border-l-[1.5px] border-input`}
        >
          Create Account
        </Link>
      </nav>

      {notice && (
        <p
          role="status"
          className="mb-6 w-full border-[1.5px] border-input px-4 py-3 text-[14px] font-medium"
        >
          {notice}
        </p>
      )}

      <div className="w-full">
        {isForgot ? (
          <ForgotPasswordForm signInUrl={signInUrl} />
        ) : (
          <AuthForm
            mode={isSignIn ? "signin" : "signup"}
            redirectUrl={redirectUrl}
            cardUuid={cardUuid}
          />
        )}
      </div>

      {/* Feature strip: three cells sharing their boundaries, one ink. */}
      <ul className="mt-8 grid w-full grid-cols-3 border-[1.5px] border-input text-center">
        {[
          { icon: Zap, label: "Fast Setup" },
          { icon: ShieldCheck, label: "Encrypted" },
          { icon: SmartphoneNfc, label: "NFC Powered" },
        ].map(({ icon: Icon, label }, i) => (
          <li key={label} className={`px-2 py-3 ${i > 0 ? "border-l-[1.5px] border-input" : ""}`}>
            <Icon
              className="mx-auto mb-1.5 h-4 w-4 text-primary"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span className="block text-[12px] font-bold">{label}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-1.5 py-2 text-[14px] font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Homepage
      </Link>
    </div>
  );
}
