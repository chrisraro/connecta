import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import {
  ArrowRight,
  LayoutDashboard,
  SmartphoneNfc,
  MessageSquare,
  CheckCircle2,
  LayoutTemplate,
  BarChart3,
  Contact,
  QrCode,
  Hand,
  UserRound,
  Inbox,
  Check,
  Star,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ─── Sticky Navigation ───────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"
        >
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-xl font-bold tracking-tight"
          >
            <SmartphoneNfc className="text-primary" aria-hidden="true" />
            <span>TapFolio</span>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            <Link
              href="/shop"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Shop
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              How it works
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <SignedIn>
              <Link href="/dashboard">
                <Button variant="outline" className="hidden rounded-xl sm:flex">
                  <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden="true" />
                  Dashboard
                </Button>
              </Link>
            </SignedIn>
            <SignedOut>
              <Link href="/auth" className="hidden sm:block">
                <Button variant="ghost" className="rounded-xl font-medium">
                  Sign in
                </Button>
              </Link>
              <Link href="/shop">
                <Button className="rounded-xl font-semibold">Get your card</Button>
              </Link>
            </SignedOut>
          </div>
        </nav>
      </header>

      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 -z-10 aspect-square w-[150%] max-w-[820px] -translate-x-1/2 rounded-full bg-primary/10 blur-[100px] sm:blur-[140px]"
        />
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary sm:text-sm">
              <SmartphoneNfc className="h-4 w-4" aria-hidden="true" />
              NFC + QR digital business cards
            </span>
            <h1 className="mt-6 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text pb-2 text-4xl font-black leading-[1.1] tracking-tighter text-transparent sm:text-6xl lg:text-7xl">
              Your business card, reinvented.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground lg:mx-0">
              Tap a premium NFC card on any phone to share a stunning profile and
              capture leads instantly. No app required for the people you meet.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/shop" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="h-14 w-full rounded-2xl px-8 text-base font-semibold shadow-lg shadow-primary/20 sm:w-auto"
                >
                  Get your card
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
              <SignedOut>
                <Link href="/auth" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 w-full rounded-2xl px-8 text-base font-semibold sm:w-auto"
                  >
                    Sign in
                  </Button>
                </Link>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 w-full rounded-2xl px-8 text-base font-semibold sm:w-auto"
                  >
                    Go to dashboard
                  </Button>
                </Link>
              </SignedIn>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground lg:justify-start">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                Free plan available
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                Ships nationwide PH
              </span>
            </div>
          </div>

          {/* NFC Card visual (pure CSS) */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <NfcCardVisual />
          </div>
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="scroll-mt-24 border-t border-border px-4 py-20 sm:px-6 sm:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="How it works"
            title="From tap to lead in seconds"
            subtitle="Three simple steps. No friction for you or the people you meet."
          />
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <StepCard
              step="01"
              icon={Hand}
              title="Tap"
              desc="Hold your TapFolio NFC card to any smartphone — or let them scan your QR code."
            />
            <StepCard
              step="02"
              icon={UserRound}
              title="Profile"
              desc="Your branded profile opens instantly with your photo, links, and call-to-actions."
            />
            <StepCard
              step="03"
              icon={Inbox}
              title="Lead captured"
              desc="They save your contact or send a message — and it lands straight in your lead inbox."
            />
          </div>
        </div>
      </section>

      {/* ─── Features grid ───────────────────────────────────────────── */}
      <section className="bg-muted/30 px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Everything included"
            title="One platform for modern networking"
            subtitle="A premium card, a beautiful profile, and the tools to turn taps into clients."
          />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={SmartphoneNfc}
              title="NFC cards"
              desc="Premium tap-to-share cards that work on any modern phone, no app needed."
            />
            <FeatureCard
              icon={MessageSquare}
              title="Lead CRM"
              desc="Capture inquiries on your profile and follow up from a simple, organized inbox."
            />
            <FeatureCard
              icon={LayoutTemplate}
              title="Profile templates"
              desc="Distinct, designer-made templates that match your brand in a few clicks."
            />
            <FeatureCard
              icon={BarChart3}
              title="Analytics"
              desc="See your total taps and engagement so you know what's working."
            />
            <FeatureCard
              icon={Contact}
              title="vCard download"
              desc="Visitors save your details to their phone contacts with a single tap."
            />
            <FeatureCard
              icon={QrCode}
              title="QR sharing"
              desc="Every profile comes with a QR code for posters, slides, and screens."
            />
          </div>
        </div>
      </section>

      {/* ─── Template showcase strip ─────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Templates"
            title="A look that's unmistakably you"
            subtitle="Start from a premium template and tune the colors to your brand."
          />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <TemplateCard
              name="Editorial"
              tag="Creatives & consultants"
              gradient="linear-gradient(135deg, #fbf9f4 0%, #f5f3ee 50%, #705838 100%)"
            />
            <TemplateCard
              name="Kinetic"
              tag="Tech & startups"
              gradient="linear-gradient(135deg, #0e0e0e 0%, #1a1a1a 50%, #ba9eff 100%)"
            />
            <TemplateCard
              name="Architectural"
              tag="Executives & real estate"
              gradient="linear-gradient(135deg, #f7f9fb 0%, #f2f4f6 50%, #00193c 100%)"
            />
          </div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────────────────── */}
      <section
        id="pricing"
        className="scroll-mt-24 border-t border-border bg-muted/30 px-4 py-20 sm:px-6 sm:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Pricing"
            title="Start free, upgrade when you grow"
            subtitle="Buy a card once. Choose a plan that fits how you network."
          />
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            <PricingCard
              name="Free"
              price="₱0"
              cadence="forever"
              desc="Everything you need to get your first card live."
              features={[
                "1 digital profile",
                "1 active NFC card",
                "2 basic templates",
                "Up to 100 leads",
                "NFC + QR sharing",
              ]}
              cta={{ label: "Get started free", href: "/auth" }}
            />
            <PricingCard
              name="Pro"
              price="₱299"
              cadence="/ month"
              highlight
              desc="For professionals who network seriously."
              features={[
                "Unlimited profiles & cards",
                "All premium templates",
                "Branding removed",
                "Lead CSV export",
                "Full analytics",
              ]}
              cta={{ label: "Upgrade to Pro", href: "/dashboard/billing" }}
            />
            <PricingCard
              name="Business"
              price="₱999"
              cadence="/ month"
              desc="For teams sharing one brand."
              features={[
                "Everything in Pro",
                "Team workspace (5 seats)",
                "Shared team branding",
                "Team lead pool",
                "White-label profiles",
              ]}
              cta={{ label: "Go Business", href: "/dashboard/billing" }}
            />
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Plans are prepaid 30-day periods, billed securely via PayRex (GCash,
            Maya, Card, QR Ph). NFC cards are available in the{" "}
            <Link href="/shop" className="font-medium text-primary underline-offset-4 hover:underline">
              shop
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ─── Testimonials ────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Loved by professionals"
            title="Networking that actually converts"
          />
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            <TestimonialCard
              quote="I stopped carrying paper cards. One tap and the lead is already in my inbox before the conversation ends."
              role="Real estate broker, Manila"
            />
            <TestimonialCard
              quote="My profile looks like a premium brand. Clients take me more seriously the moment they see it."
              role="Brand designer, Cebu"
            />
            <TestimonialCard
              quote="The lead capture form is the killer feature. No more lost contacts after events."
              role="Insurance advisor, Davao"
            />
          </div>
        </div>
      </section>

      {/* ─── Final CTA ───────────────────────────────────────────────── */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-foreground px-6 py-16 text-center text-background sm:px-12 sm:py-20">
          <div
            aria-hidden="true"
            className="absolute right-0 top-0 h-64 w-64 bg-primary/30 blur-[90px]"
          />
          <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
            Ready to make a lasting impression?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-background/70">
            Get your TapFolio card and turn every introduction into an
            opportunity.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/shop" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="h-14 w-full rounded-2xl bg-primary px-8 text-base font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto"
              >
                Get your card
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
            <SignedOut>
              <Link href="/auth" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 w-full rounded-2xl border-background/30 bg-transparent px-8 text-base font-semibold text-background hover:bg-background/10 sm:w-auto"
                >
                  Start for free
                </Button>
              </Link>
            </SignedOut>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <SmartphoneNfc className="text-primary" aria-hidden="true" />
                <span>TapFolio</span>
              </Link>
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                Premium NFC digital business cards for modern professionals.
              </p>
            </div>
            <FooterCol
              title="Product"
              links={[
                { label: "Shop", href: "/shop" },
                { label: "How it works", href: "#how-it-works" },
                { label: "Pricing", href: "#pricing" },
              ]}
            />
            <FooterCol
              title="Account"
              links={[
                { label: "Sign in", href: "/auth" },
                { label: "Dashboard", href: "/dashboard" },
                { label: "Cart", href: "/shop/cart" },
              ]}
            />
            <FooterCol
              title="Company"
              links={[
                { label: "Privacy", href: "#" },
                { label: "Terms", href: "#" },
                { label: "Support", href: "#" },
              ]}
            />
          </div>
          <div className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} TapFolio. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Building blocks ─────────────────────────────────────────────── */

function NfcCardVisual() {
  return (
    <div className="relative" aria-hidden="true">
      <div className="absolute inset-0 -z-10 bg-primary/20 blur-[80px]" />
      <div className="relative aspect-[1.586/1] w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-7 shadow-2xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
              <SmartphoneNfc className="h-5 w-5 text-primary" />
              TapFolio
            </span>
            <div className="flex flex-col gap-1">
              <span className="h-3 w-3 rounded-full border border-white/40" />
              <span className="h-3 w-3 rounded-full border border-white/30" />
            </div>
          </div>
          <div>
            <div className="h-2.5 w-32 rounded-full bg-white/80" />
            <div className="mt-2 h-2 w-24 rounded-full bg-white/40" />
            <div className="mt-5 flex items-center gap-2">
              <span className="rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
                TAP TO CONNECT
              </span>
              <span className="h-8 w-8 rounded-md border border-white/20 bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">{subtitle}</p>
      )}
    </div>
  );
}

function StepCard({
  step,
  icon: Icon,
  title,
  desc,
}: {
  step: string;
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <div className="relative rounded-3xl border border-border bg-card p-7">
      <span className="text-sm font-black tracking-widest text-muted-foreground/50">
        {step}
      </span>
      <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-7 w-7" aria-hidden="true" strokeWidth={2.25} />
      </div>
      <h3 className="mt-5 text-xl font-bold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-7 transition-colors hover:border-primary/30">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" aria-hidden="true" strokeWidth={2.25} />
      </div>
      <h3 className="mt-5 text-lg font-bold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

function TemplateCard({
  name,
  tag,
  gradient,
}: {
  name: string;
  tag: string;
  gradient: string;
}) {
  return (
    <div className="group overflow-hidden rounded-3xl border border-border bg-card">
      <div
        className="aspect-[4/5] w-full transition-transform duration-500 group-hover:scale-105"
        style={{ background: gradient }}
        aria-hidden="true"
      />
      <div className="p-5">
        <h3 className="text-lg font-bold tracking-tight">{name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{tag}</p>
      </div>
    </div>
  );
}

function PricingCard({
  name,
  price,
  cadence,
  desc,
  features,
  cta,
  highlight,
}: {
  name: string;
  price: string;
  cadence: string;
  desc: string;
  features: string[];
  cta: { label: string; href: string };
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-3xl border bg-card p-8 ${
        highlight
          ? "border-primary shadow-xl shadow-primary/10 ring-1 ring-primary/20"
          : "border-border"
      }`}
    >
      {highlight && (
        <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
          Most popular
        </span>
      )}
      <h3 className="text-lg font-bold tracking-tight">{name}</h3>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-black tracking-tighter">{price}</span>
        <span className="text-sm text-muted-foreground">{cadence}</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{desc}</p>
      <ul className="mt-6 flex-1 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link href={cta.href} className="mt-8">
        <Button
          className="h-12 w-full rounded-2xl font-semibold"
          variant={highlight ? "default" : "outline"}
        >
          {cta.label}
        </Button>
      </Link>
    </div>
  );
}

function TestimonialCard({ quote, role }: { quote: string; role: string }) {
  return (
    <figure className="flex h-full flex-col rounded-3xl border border-border bg-card p-7">
      <div className="flex gap-0.5 text-primary" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-current" />
        ))}
      </div>
      <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="mt-5 text-sm font-medium text-muted-foreground">
        {role}
      </figcaption>
    </figure>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
