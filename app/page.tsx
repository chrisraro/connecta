import { Button } from "@/components/ui/button";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-yellow-500/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border p-6 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
          <SmartphoneNfc className="text-yellow-500" />
          <span>TapFolio</span>
        </div>

        <div className="flex gap-4">
          <SignedIn>
            <Link href="/dashboard">
              <Button variant="outline" className="border-border text-foreground hover:bg-muted">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <Button className="bg-foreground text-background hover:bg-foreground/90 font-semibold px-6">
                Client Login
              </Button>
            </SignInButton>
          </SignedOut>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative flex flex-col items-center justify-center text-center px-4 pt-24 pb-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-yellow-500/5 blur-[120px] rounded-full -z-10" />
        
        <div className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full px-4 py-1.5 text-sm font-medium mb-8 animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Powered by Next-Gen AI & NFC
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter max-w-5xl mb-8 leading-[0.9] bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
          Close Deals with <br />
          a Single Tap.
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
          Premium NFC business cards for modern real estate agents. 
          Share your stunning AI-powered portfolio instantly.
        </p>

        <div className="flex gap-4 flex-col sm:flex-row">
          <SignedIn>
            <Link href="/dashboard">
              <Button size="lg" className="bg-yellow-500 text-black hover:bg-yellow-500/90 font-bold h-16 px-10 text-xl border-none shadow-2xl shadow-yellow-500/20 rounded-2xl">
                Go to Dashboard
                <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 font-bold h-16 px-10 text-xl border-none shadow-2xl shadow-foreground/10 rounded-2xl">
                Start for Free
                <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </SignInButton>
          </SignedOut>

          <Link href="https://tapandsave.com/shop" target="_blank">
            <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-muted h-16 px-10 text-xl rounded-2xl">
              Buy Cards
            </Button>
          </Link>
        </div>

        {/* Social Proof */}
        <div className="mt-20 flex flex-col items-center gap-6">
            <p className="text-xs uppercase tracking-[0.3em] font-bold text-muted-foreground">Trusted by Top Brokers</p>
            <div className="flex flex-wrap justify-center gap-8 opacity-40 grayscale contrast-125">
                <span className="text-2xl font-black italic">RE/MAX</span>
                <span className="text-2xl font-black">KW</span>
                <span className="text-2xl font-black tracking-tighter">CENTURY 21</span>
                <span className="text-2xl font-black">Exp</span>
            </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-32 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <FeatureCard 
                icon={Zap}
                title="Instant AI Profiles"
                desc="Generate a high-converting digital portfolio in 30 seconds. Choose from luxury or modern templates."
            />
            <FeatureCard 
                icon={SmartphoneNfc}
                title="NFC Tap Sharing"
                desc="Tap your physical card on any smartphone to instantly share your contact details and listings."
            />
            <FeatureCard 
                icon={MessageSquare}
                title="Lead CRM"
                desc="Capture leads directly on your profile. Receive instant notifications and manage follow-ups."
            />
        </div>
      </section>

      {/* Why Section */}
      <section className="bg-muted/30 py-32">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-8">
                    Your entire business <br />
                    in one card.
                </h2>
                <div className="space-y-6">
                    <BenefitItem text="Professional AI-generated business cards" />
                    <BenefitItem text="Real-time property listing integration" />
                    <BenefitItem text="Unlimited taps and social links" />
                    <BenefitItem text="No app required for your clients" />
                </div>
                <div className="mt-12">
                    <Link href="https://tapandsave.com/shop" target="_blank">
                        <Button className="bg-primary text-primary-foreground font-bold h-12 rounded-xl">
                            Explore the Shop
                        </Button>
                    </Link>
                </div>
            </div>
            <div className="relative">
                <div className="absolute inset-0 bg-yellow-500/20 blur-[100px] -z-10" />
                <div className="bg-card border border-border p-8 rounded-[3rem] shadow-2xl">
                    <div className="aspect-[4/3] bg-muted rounded-[2rem] overflow-hidden">
                        <img 
                            src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                            className="w-full h-full object-cover opacity-80"
                            alt="Luxury Home"
                        />
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 text-center px-4">
        <div className="max-w-4xl mx-auto bg-foreground text-background p-12 md:p-20 rounded-[4rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/20 blur-[80px]" />
            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6">Ready to scale?</h2>
            <p className="text-xl text-background/60 mb-10 max-w-xl mx-auto font-medium">
                Join 5,000+ real estate agents who have ditched paper cards for the future.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
                <SignedOut>
                    <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                        <Button size="lg" className="bg-yellow-500 text-black hover:bg-yellow-500/90 font-bold h-16 px-10 text-xl rounded-2xl border-none">
                            Get Started Free
                        </Button>
                    </SignInButton>
                </SignedOut>
                <SignedIn>
                    <Link href="/dashboard">
                        <Button size="lg" className="bg-yellow-500 text-black hover:bg-yellow-500/90 font-bold h-16 px-10 text-xl rounded-2xl border-none">
                            Dashboard
                        </Button>
                    </Link>
                </SignedIn>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border p-12 bg-card text-center text-muted-foreground">
        <div className="flex justify-center gap-2 font-bold text-foreground mb-4">
          <SmartphoneNfc className="text-yellow-500" />
          <span>TapFolio</span>
        </div>
        <p className="text-sm mb-6">&copy; {new Date().getFullYear()} TapFolio. All rights reserved.</p>
        <div className="flex justify-center gap-8 text-xs font-bold uppercase tracking-widest">
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
        <div className="flex flex-col gap-4 p-8 bg-card rounded-[2.5rem] border border-border hover:border-primary/30 transition-all duration-300">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <Icon className="w-8 h-8" strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black tracking-tight">{title}</h3>
            <p className="text-muted-foreground leading-relaxed font-medium">{desc}</p>
        </div>
    );
}

function BenefitItem({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-yellow-500" />
            <span className="text-lg font-bold tracking-tight">{text}</span>
        </div>
    );
}
