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
} from "lucide-react";
import Link from "next/link";
import { HeraldMark } from "@/components/brand/HeraldMark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Reveal } from "@/components/ui/reveal";
import { HERALD } from "@/lib/brand";
import { TEMPLATES as TEMPLATE_METAS } from "@/components/templates/registry";
import { HeroProfilePreview } from "@/components/marketing/HeroProfilePreview";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ─── Sticky Glass Navigation ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"
        >
          <Link
            href="/"
            className="flex min-h-11 shrink-0 items-center gap-2 text-xl font-bold tracking-tight"
          >
            <HeraldMark className="h-6 w-6 text-primary" />
            <span>{HERALD.name}</span>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/shop"
              className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Shop
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              How it works
            </Link>
            <Link
              href="#pricing"
              className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <SignedIn>
              <Button variant="outline" className="hidden h-11 rounded-xl sm:flex" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden="true" />
                  Dashboard
                </Link>
              </Button>
            </SignedIn>
            <SignedOut>
              <Link href="/auth" className="hidden sm:block">
                <Button variant="ghost" className="rounded-xl font-medium">
                  Sign in
                </Button>
              </Link>
              <Link href="/shop">
                <Button className="cta-sheen rounded-xl font-semibold">
                  Get your card
                </Button>
              </Link>
            </SignedOut>
          </div>
        </nav>
      </header>

      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
        {/* Aurora / gradient-mesh background */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
          <div className="aurora-blob aurora-a left-[8%] top-[6%] h-[26rem] w-[26rem] bg-primary/15" />
          <div className="aurora-blob aurora-b right-[4%] top-[2%] h-[24rem] w-[24rem] bg-[var(--chart-5)]/20" />
          <div className="aurora-blob aurora-c left-1/2 top-[30%] h-[22rem] w-[22rem] -translate-x-1/2 bg-[var(--chart-4)]/15" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary word-rise sm:text-sm" style={{ animationDelay: "60ms" }}>
              <SmartphoneNfc className="h-4 w-4" aria-hidden="true" />
              NFC + QR digital business cards
            </span>
            <h1
              className="mt-6 text-4xl font-black leading-[1.1] tracking-tighter sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <span className="word-rise inline-block" style={{ animationDelay: "120ms" }}>
                Your
              </span>{" "}
              <span className="word-rise inline-block" style={{ animationDelay: "200ms" }}>
                business
              </span>{" "}
              <span className="word-rise inline-block" style={{ animationDelay: "280ms" }}>
                card,
              </span>{" "}
              <span className="word-rise inline-block" style={{ animationDelay: "380ms" }}>
                reinvented.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground word-rise lg:mx-0" style={{ animationDelay: "460ms" }}>
              Tap a premium NFC card on any phone to share a stunning profile and
              capture leads instantly. No app required for the people you meet.
            </p>
            <div className="mt-9 flex flex-col gap-3 word-rise sm:flex-row sm:justify-center lg:justify-start" style={{ animationDelay: "540ms" }}>
              <Link href="/shop" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="cta-sheen h-14 w-full rounded-2xl px-8 text-base font-semibold shadow-lg shadow-primary/20 sm:w-auto"
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
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground word-rise lg:justify-start" style={{ animationDelay: "620ms" }}>
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

          {/* Real product preview: an actual profile template rendered at
              phone scale, not a placeholder mockup (audit: "you're selling
              a look; show the look"). */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <HeroProfilePreview />
          </div>
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="relative scroll-mt-24 border-t border-border px-4 py-20 sm:px-6 sm:py-28"
      >
        <div className="dot-pattern pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionHeading
              eyebrow="How it works"
              title="From tap to lead in seconds"
              subtitle="Three simple steps. No friction for you or the people you meet."
            />
          </Reveal>
          <Steps />
        </div>
      </section>

      {/* ─── Features grid ───────────────────────────────────────────── */}
      <section className="relative bg-muted/30 px-4 py-20 sm:px-6 sm:py-28">
        <div className="dot-pattern pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionHeading
              eyebrow="Everything included"
              title="One platform for modern networking"
              subtitle="A premium card, a beautiful profile, and the tools to turn taps into clients."
            />
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: SmartphoneNfc, title: "NFC cards", desc: "Premium tap-to-share cards that work on any modern phone, no app needed." },
              { icon: MessageSquare, title: "Lead CRM", desc: "Capture inquiries on your profile and follow up from a simple, organized inbox." },
              { icon: LayoutTemplate, title: "Profile templates", desc: "Distinct, designer-made templates that match your brand in a few clicks." },
              { icon: BarChart3, title: "Analytics", desc: "See your total taps and engagement so you know what's working." },
              { icon: Contact, title: "vCard download", desc: "Visitors save your details to their phone contacts with a single tap." },
              { icon: QrCode, title: "QR sharing", desc: "Every profile comes with a QR code for posters, slides, and screens." },
            ].map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 90}>
                <FeatureCard icon={f.icon} title={f.title} desc={f.desc} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Template showcase marquee ───────────────────────────────── */}
      <section className="overflow-hidden px-0 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <SectionHeading
              eyebrow="Templates"
              title="A look that's unmistakably you"
              subtitle="Start from a premium template and tune the colors to your brand."
            />
          </Reveal>
        </div>
        <Reveal className="mt-14">
          <TemplateMarquee />
        </Reveal>
      </section>

      {/* ─── Pricing ─────────────────────────────────────────────────── */}
      <section
        id="pricing"
        className="relative scroll-mt-24 border-t border-border bg-muted/30 px-4 py-20 sm:px-6 sm:py-28"
      >
        <div className="dot-pattern pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionHeading
              eyebrow="Pricing"
              title="Start free, upgrade when you grow"
              subtitle="Buy a card once. Choose a plan that fits how you network."
            />
          </Reveal>
          <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
            <Reveal delay={0} className="h-full">
              <PricingCard
                name="Free"
                price="₱0"
                cadence="forever"
                desc="Everything you need to get your first card live."
                features={["1 digital profile", "1 active NFC card", "2 basic templates", "Up to 100 leads", "NFC + QR sharing"]}
                cta={{ label: "Get started free", href: "/auth" }}
              />
            </Reveal>
            <Reveal delay={100} className="h-full">
              <PricingCard
                name="Pro"
                price="₱299"
                cadence="/ month"
                highlight
                desc="For professionals who network seriously."
                features={["Unlimited profiles & cards", "All premium templates", "Branding removed", "Lead CSV export", "Full analytics"]}
                cta={{ label: "Upgrade to Pro", href: "/dashboard/billing" }}
              />
            </Reveal>
            <Reveal delay={200} className="h-full">
              <PricingCard
                name="Business"
                price="₱999"
                cadence="/ month"
                desc="For teams sharing one brand."
                features={["Everything in Pro", "Team workspace (5 seats)", "Shared team branding", "Team lead pool", "White-label profiles"]}
                cta={{ label: "Go Business", href: "/dashboard/billing" }}
              />
            </Reveal>
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

      {/* ─── Final CTA ───────────────────────────────────────────────── */}
      <section className="px-4 pb-24 sm:px-6">
        <Reveal>
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-neutral-950 border border-neutral-800/80 px-6 py-16 text-center text-white sm:px-12 sm:py-20 shadow-2xl">
            <div
              aria-hidden="true"
              className="aurora-blob aurora-a absolute right-0 top-0 h-64 w-64 bg-yellow-500/10 blur-[80px]"
            />
            <div
              aria-hidden="true"
              className="aurora-blob aurora-c absolute left-0 bottom-0 h-56 w-56 bg-primary/20 blur-[80px]"
            />
            <h2 className="relative z-10 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Ready to make a lasting impression?
            </h2>
            <p className="relative z-10 mx-auto mt-5 max-w-xl text-neutral-400">
              Get your {HERALD.name} card and turn every introduction into an
              opportunity.
            </p>
            <div className="relative z-10 mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/shop" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="cta-sheen h-14 w-full rounded-2xl bg-white px-8 text-base font-bold text-black hover:bg-neutral-200 hover:text-black transition-snap hover:scale-105 active:scale-95 sm:w-auto shadow-md"
                >
                  Get your card
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
              <SignedOut>
                <Link href="/auth" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="h-14 w-full rounded-2xl border border-white/20 bg-white/5 px-8 text-base font-bold text-white hover:bg-white/10 hover:border-white/40 hover:text-white transition-snap hover:scale-105 active:scale-95 sm:w-auto"
                  >
                    Start for free
                  </Button>
                </Link>
              </SignedOut>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" className="flex min-h-11 items-center gap-2 text-lg font-bold tracking-tight">
                <HeraldMark className="h-5 w-5 text-primary" />
                <span>{HERALD.name}</span>
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
                { label: "Privacy", href: "/privacy" },
                { label: "Terms", href: "/terms" },
                { label: "Support", href: `mailto:${HERALD.supportEmail}` },
              ]}
            />
          </div>
          <div className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {HERALD.name}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Building blocks ─────────────────────────────────────────────── */

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
      <h2
        className="mt-3 text-3xl font-black tracking-tight sm:text-4xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">{subtitle}</p>
      )}
    </div>
  );
}

function Steps() {
  const steps = [
    { step: "01", icon: Hand, title: "Tap", desc: "Hold your Herald NFC card to any smartphone — or let them scan your QR code." },
    { step: "02", icon: UserRound, title: "Profile", desc: "Your branded profile opens instantly with your photo, links, and call-to-actions." },
    { step: "03", icon: Inbox, title: "Lead captured", desc: "They save your contact or send a message — and it lands straight in your lead inbox." },
  ];
  return (
    <div className="relative mt-14">
      {/* Connecting line that draws in on reveal (desktop) */}
      <Reveal className="pointer-events-none absolute left-0 right-0 top-16 hidden md:block" once>
        <div className="gradient-divider draw-line mx-[16%]" data-drawn="true" />
      </Reveal>
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((s, i) => (
          <Reveal key={s.step} delay={i * 120}>
            <StepCard step={s.step} icon={s.icon} title={s.title} desc={s.desc} />
          </Reveal>
        ))}
      </div>
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
    <div className="card-glow relative rounded-3xl border border-border bg-card p-7">
      {/* Was text-muted-foreground/50. Re-verified via true canvas ground
          truth on the live rendered element (draw the real card bg, then
          the real computed text color, on a <canvas>, read back sRGB via
          getImageData — not hand-parsed computed-style strings): 2.33:1 in
          this app's default (dark) theme, which is what a fresh,
          unauthenticated visitor actually gets — a real 4.5:1 failure at
          this 14px size, not a tooling artifact. "How it works" is a
          genuinely ordered 3-step sequence so the numbers stay, just at a
          contrast that actually clears the card (~12.9:1 ground-truth
          after this change). */}
      <span className="text-sm font-black tracking-widest text-foreground/70">
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
    <div className="card-glow h-full rounded-3xl border border-border bg-card p-7">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" aria-hidden="true" strokeWidth={2.25} />
      </div>
      <h3 className="mt-5 text-lg font-bold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

// Derived from TEMPLATE_THEMES/registry.ts — the single source of truth for
// template names, colors and positioning — instead of a hand-maintained
// list that drifts (this previously advertised a deleted 4th template in
// pre-refactor colors; see components/templates/theme.ts for current colors).
const TEMPLATES = TEMPLATE_METAS.map((t) => ({
  name: t.name,
  tag: t.bestFor.slice(0, 2).join(" & "),
  gradient: t.thumbnail,
}));

function TemplateMarquee() {
  // Duplicate the list for a seamless -50% loop.
  const items = [...TEMPLATES, ...TEMPLATES];
  return (
    <div className="marquee-group relative" aria-label="Profile templates">
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent sm:w-28" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent sm:w-28" />
      <div className="marquee-track gap-5 px-4 sm:px-6">
        {items.map((t, i) => (
          <div
            key={`${t.name}-${i}`}
            className="group w-[240px] shrink-0 overflow-hidden rounded-3xl border border-border bg-card sm:w-[280px]"
            aria-hidden={i >= TEMPLATES.length ? true : undefined}
          >
            <div
              className="aspect-[4/5] w-full transition-transform duration-500 group-hover:scale-105"
              style={{ background: t.gradient }}
              aria-hidden="true"
            />
            <div className="p-5">
              <h3 className="text-lg font-bold tracking-tight">{t.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.tag}</p>
            </div>
          </div>
        ))}
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
      className={`card-glow relative flex h-full flex-col rounded-3xl border bg-card p-8 ${
        highlight
          ? "border-primary shadow-xl shadow-primary/10 ring-1 ring-primary/20 lg:scale-[1.04]"
          : "border-border"
      }`}
    >
      {highlight && (
        <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/30">
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
          className={`h-12 w-full rounded-2xl font-semibold ${highlight ? "cta-sheen" : ""}`}
          variant={highlight ? "default" : "outline"}
        >
          {cta.label}
        </Button>
      </Link>
    </div>
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
      <ul className="mt-1 space-y-0.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="inline-flex min-h-11 min-w-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground hover:translate-x-0.5"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
