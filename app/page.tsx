import { Button } from "@/components/ui/button";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { ArrowRight, LayoutDashboard, SmartphoneNfc } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-yellow-500/30">
      {/* Navigation */}
      <nav className="border-b border-white/10 p-6 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
          <SmartphoneNfc className="text-yellow-500" />
          <span>TapFolio</span>
        </div>

        <div className="flex gap-4">
          <SignedIn>
            <Link href="/dashboard">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:text-white">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button className="bg-white text-black hover:bg-gray-200 font-semibold">
                Client Login
              </Button>
            </SignInButton>
          </SignedOut>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center text-center px-4 pt-32 pb-20">
        <div className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full px-4 py-1.5 text-sm font-medium mb-8 animate-fade-in">
          The Future of Real Estate Networking
        </div>

        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter max-w-4xl mb-8 bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
          Tap. Connect. <br />
          Close the Deal.
        </h1>

        <p className="text-xl text-gray-400 max-w-2xl mb-12 leading-relaxed">
          Premium NFC business cards powered by AI. Generate a stunning portfolio in seconds and capture leads with a single tap.
        </p>

        <div className="flex gap-4 flex-col sm:flex-row">
          <SignedIn>
            <Link href="/dashboard">
              <Button size="lg" className="bg-yellow-500 text-black hover:bg-yellow-400 font-bold h-14 px-8 text-lg">
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button size="lg" className="bg-white text-black hover:bg-gray-200 font-bold h-14 px-8 text-lg">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </SignInButton>
          </SignedOut>

          <Link href="https://tapandsave.com/shop" target="_blank">
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 h-14 px-8 text-lg">
              Buy NFC Cards
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full p-6 text-center text-gray-600 text-sm">
        &copy; {new Date().getFullYear()} TapFolio. All rights reserved.
      </footer>
    </div>
  );
}
