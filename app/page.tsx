import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { 
  ArrowRight, 
  LayoutDashboard, 
  SmartphoneNfc, 
  Zap, 
  Sparkles, 
  MessageSquare, 
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-yellow-500/30 overflow-x-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tighter shrink-0">
          <SmartphoneNfc className="text-yellow-500" />
          <span>TapFolio</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <ThemeToggle />
          <SignedIn>
            <Link href="/dashboard">
              <Button variant="outline" className="border-border text-foreground hover:bg-muted hidden sm:flex">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          </SignedIn>
          <SignedOut>
            <Link href="/auth">
              <Button className="bg-foreground text-background hover:bg-foreground/90 font-semibold px-4 sm:px-6 text-sm sm:text-base">
                Client Login
              </Button>
            </Link>
          </SignedOut>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative flex flex-col items-center justify-center text-center px-4 pt-16 sm:pt-24 pb-20 sm:pb-32 overflow-hidden">
        {/* Responsive Background Orb */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] max-w-[800px] aspect-square bg-yellow-500/5 blur-[80px] sm:blur-[120px] rounded-full -z-10" />
        
        <div className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium mb-8 animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Powered by Next-Gen AI & NFC
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter max-w-5xl mb-6 sm:mb-8 leading-[1.1] pb-2 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
          Close Deals with <br />
          a Single Tap.
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-10 sm:mb-12 leading-relaxed px-4">
          Premium NFC business cards for modern professionals. 
          Share your stunning digital portfolio and capture leads instantly.
        </p>

        <div className="flex gap-4 flex-col sm:flex-row w-full sm:w-auto px-4">
          <SignedIn>
            <Link href="/dashboard" className="w-full">
              <Button size="lg" className="w-full sm:w-auto bg-yellow-500 text-black hover:bg-yellow-500/90 font-bold h-14 sm:h-16 px-8 sm:px-10 text-lg sm:text-xl border-none shadow-2xl shadow-yellow-500/20 rounded-2xl">
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 sm:h-6 w-5 sm:w-6" />
              </Button>
            </Link>
          </SignedIn>
          <SignedOut>
            <Link href="/auth?mode=signup" className="w-full">
              <Button size="lg" className="w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90 font-bold h-14 sm:h-16 px-8 sm:px-10 text-lg sm:text-xl border-none shadow-2xl shadow-foreground/10 rounded-2xl">
                Start for Free
                <ArrowRight className="ml-2 h-5 sm:h-6 w-5 sm:w-6" />
              </Button>
            </Link>
          </SignedOut>

          <Link href="/shop" className="w-full">
            <Button size="lg" variant="outline" className="w-full sm:w-auto border-border text-foreground hover:bg-muted h-14 sm:h-16 px-8 sm:px-10 text-lg sm:text-xl rounded-2xl">
              Shop Now
            </Button>
          </Link>
        </div>
      </main>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-32 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            <FeatureCard 
                icon={Zap}
                title="Instant AI Profiles"
                desc="Generate a high-converting digital portfolio in 30 seconds. Choose from professional, modern templates."
            />
            <FeatureCard 
                icon={SmartphoneNfc}
                title="NFC Tap Sharing"
                desc="Tap your physical card on any smartphone to instantly share your contact details and digital identity."
            />
            <FeatureCard 
                icon={MessageSquare}
                title="Lead CRM"
                desc="Capture leads directly on your profile. Receive instant notifications and manage follow-ups efficiently."
            />
        </div>
      </section>

      {/* Why Section */}
      <section className="bg-muted/30 py-20 sm:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            <div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-8 text-foreground">
                    Your entire business <br className="hidden sm:block" />
                    in one card.
                </h2>
                <div className="space-y-4 sm:space-y-6">
                    <BenefitItem text="Professional AI-powered business cards" />
                    <BenefitItem text="Integrated Lead CRM and analytics" />
                    <BenefitItem text="Unlimited taps and social links" />
                    <BenefitItem text="No app required for your clients" />
                </div>
                <div className="mt-10 sm:mt-12">
                    <Link href="/shop">
                        <Button className="bg-primary text-primary-foreground font-bold h-12 rounded-xl w-full sm:w-auto">
                            Explore the Shop
                        </Button>
                    </Link>
                </div>
            </div>
            <div className="relative">
                <div className="absolute inset-0 bg-yellow-500/20 blur-[80px] sm:blur-[100px] -z-10" />
                <div className="bg-card border border-border p-4 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-2xl">
                    <div className="aspect-[4/3] bg-muted rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden">
                        <img 
                            src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                            className="w-full h-full object-cover opacity-80"
                            alt="Professional Profile"
                        />
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32 text-center px-4">
        <div className="max-w-4xl mx-auto bg-foreground text-background p-8 sm:p-12 md:p-20 rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-yellow-500/20 blur-[60px] sm:blur-[80px]" />
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight mb-6">Ready to scale?</h2>
            <p className="text-lg sm:text-xl text-background/60 mb-10 max-w-xl mx-auto font-medium px-4">
                Join thousands of professionals who have ditched paper cards for the future of networking.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 px-4">
                <SignedOut>
                    <Link href="/auth?mode=signup" className="w-full sm:w-auto">
                        <Button size="lg" className="w-full sm:w-auto bg-yellow-500 text-black hover:bg-yellow-500/90 font-bold h-14 sm:h-16 px-8 sm:px-10 text-lg sm:text-xl rounded-2xl border-none">
                            Get Started Free
                        </Button>
                    </Link>
                </SignedOut>
                <SignedIn>
                    <Link href="/dashboard" className="w-full sm:w-auto">
                        <Button size="lg" className="w-full sm:w-auto bg-yellow-500 text-black hover:bg-yellow-500/90 font-bold h-14 sm:h-16 px-8 sm:px-10 text-lg sm:text-xl rounded-2xl border-none">
                            Dashboard
                        </Button>
                    </Link>
                </SignedIn>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border p-8 sm:p-12 bg-card text-center text-muted-foreground">
        <div className="flex justify-center gap-2 font-bold text-foreground mb-4">
          <SmartphoneNfc className="text-yellow-500" />
          <span>TapFolio</span>
        </div>
        <p className="text-sm mb-6">&copy; {new Date().getFullYear()} TapFolio. All rights reserved.</p>
        <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
            <Link href="#" className="hover:text-primary">Privacy</Link>
            <Link href="#" className="hover:text-primary">Terms</Link>
            <Link href="#" className="hover:text-primary">Support</Link>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ElementType, title: string, desc: string }) {
    return (
        <div className="flex flex-col gap-4 p-6 sm:p-8 bg-card rounded-[2rem] sm:rounded-[2.5rem] border border-border hover:border-primary/30 transition-all duration-300">
            <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-2xl sm:rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <Icon className="w-6 sm:w-8 h-6 sm:h-8" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">{title}</h3>
            <p className="text-muted-foreground leading-relaxed font-medium text-sm sm:text-base">{desc}</p>
        </div>
    );
}

function BenefitItem({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3 text-foreground">
            <CheckCircle2 className="w-5 sm:w-6 h-5 sm:h-6 text-yellow-500 shrink-0" />
            <span className="text-base sm:text-lg font-bold tracking-tight">{text}</span>
        </div>
    );
}
