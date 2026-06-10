import { SignIn, SignUp } from '@clerk/nextjs';
import { SmartphoneNfc, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

export default function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; card_uuid?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
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

  // Build redirect URL - always go to callback first to check admin status
  const redirectUrl = '/auth/callback';

  // Build auth URLs with card_uuid preserved when switching between sign-in/sign-up
  const signUpUrl = cardUuid
    ? `/auth?mode=signup&card_uuid=${encodeURIComponent(cardUuid)}`
    : '/auth?mode=signup';

  const signInUrl = cardUuid
    ? `/auth?mode=signin&card_uuid=${encodeURIComponent(cardUuid)}`
    : '/auth?mode=signin';

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:px-6">
      <div className="w-full max-w-[420px] flex flex-col items-center">
        {/* Logo and Header */}
        <div className="w-full mb-6 sm:mb-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-yellow-500/10 dark:bg-yellow-500/10 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 ring-1 ring-yellow-500/20">
              <SmartphoneNfc className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-600 dark:text-yellow-500" strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
              TapFolio
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
              Digital Business Card • Lead CRM • NFC Hardware
            </p>
          </div>
        </div>

        {/* Auth Form */}
        <div className="w-full">
          {isSignIn ? (
            <SignIn
              routing="hash"
              forceRedirectUrl={redirectUrl}
              afterSignInUrl={redirectUrl}
              signUpUrl={signUpUrl}
            />
          ) : (
            <SignUp
              routing="hash"
              forceRedirectUrl={redirectUrl}
              afterSignUpUrl={redirectUrl}
              signInUrl={signInUrl}
            />
          )}
        </div>

        {/* Exit Link */}
        <div className="w-full mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-500 transition-colors py-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Exit to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
