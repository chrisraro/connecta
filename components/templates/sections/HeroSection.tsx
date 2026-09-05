import {
  Phone,
  Mail,
  Globe,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Link as LinkIcon,
} from "lucide-react";
import { ProfileInfo, ProfileData } from "@/types/profile";
import { readableTextColor } from "@/lib/utils";
import { TemplateTheme } from "../theme";
import { measureClass } from "./measure";
import { ProfileImage } from "../ProfileImage";

const SOCIAL_ICONS: Record<string, React.ElementType> = {
  Instagram: Instagram,
  Facebook: Facebook,
  LinkedIn: Linkedin,
  Twitter: Twitter,
  TikTok: LinkIcon,
  YouTube: Youtube,
  Website: Globe,
};

type Props = {
  agent: ProfileInfo;
  theme: TemplateTheme;
  resolvedImages?: ProfileData["resolvedImages"];
  /**
   * The name is the page's primary heading everywhere ProfileRenderer is the
   * actual page (the public profile at app/p/[id]) — "h1" (the default)
   * is correct there. The dashboard builder embeds this same renderer as a
   * *preview* inside a page that already has its own h1 (the builder's page
   * title), so it passes "h2" to avoid a second, competing h1 (a real,
   * measured defect: three h1s on one page). Kept as a prop rather than two
   * copies of every Hero variant so the real public page keeps its correct
   * heading semantics.
   */
  headingLevel?: "h1" | "h2";
};

/**
 * The hero is the single most important composition surface: it must
 * genuinely branch on `theme.composition.hero` rather than reusing one
 * layout in three costumes.
 *
 * - editorial-stack: small asymmetric portrait, name stacked below, single
 *   narrow column — a magazine masthead.
 * - full-bleed-portrait: a large edge-to-edge image with the name
 *   overlaid at the foot of it — a poster, not a business card.
 * - structured-split: a fixed-width photo column beside a text column,
 *   a strict two-cell grid — no image ever floats free of the grid.
 */
export function HeroSection({ agent, theme, resolvedImages, headingLevel = "h1" }: Props) {
  switch (theme.composition.hero) {
    case "full-bleed-portrait":
      return (
        <FullBleedPortraitHero
          agent={agent}
          theme={theme}
          resolvedImages={resolvedImages}
          headingLevel={headingLevel}
        />
      );
    case "structured-split":
      return (
        <StructuredSplitHero
          agent={agent}
          theme={theme}
          resolvedImages={resolvedImages}
          headingLevel={headingLevel}
        />
      );
    case "editorial-stack":
    default:
      return (
        <EditorialStackHero
          agent={agent}
          theme={theme}
          resolvedImages={resolvedImages}
          headingLevel={headingLevel}
        />
      );
  }
}

function SocialLinks({
  agent,
  theme,
  tone,
}: {
  agent: ProfileInfo;
  theme: TemplateTheme;
  tone: "on-surface" | "on-image";
}) {
  if (!agent.socialLinks || agent.socialLinks.length === 0) return null;
  return (
    <div className="flex gap-3 mt-6">
      {agent.socialLinks.map((link, i) => {
        const Icon = SOCIAL_ICONS[link.platform] || LinkIcon;
        return (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-[var(--r-sm)] flex items-center justify-center"
            style={
              tone === "on-image"
                ? { backgroundColor: "rgba(255,255,255,0.14)", color: "#ffffff" }
                : { backgroundColor: theme.colors.surface, color: theme.colors.ink }
            }
          >
            <Icon className="w-4 h-4" />
          </a>
        );
      })}
    </div>
  );
}

function EditorialStackHero({ agent, theme, resolvedImages, headingLevel = "h1" }: Props) {
  const NameHeading = headingLevel;
  return (
    <section className="pt-12 pb-8" style={{ backgroundColor: theme.colors.background }}>
      <div className={measureClass(theme)}>
        <div className="flex justify-start mb-8 ml-4">
          <div
            className="w-32 h-32 rounded-[var(--r-lg)] overflow-hidden"
            style={{ backgroundColor: theme.colors.surface, boxShadow: "var(--e-raised)" }}
          >
            <ProfileImage
              src={agent.avatarUrl}
              alt={agent.fullName}
              fallbackSeed={agent.fullName}
              className="w-full h-full object-cover"
              resolvedImages={resolvedImages}
            />
          </div>
        </div>

        <div className="mb-8">
          <NameHeading
            className="text-4xl font-normal mb-3 leading-tight"
            style={{
              fontFamily: `var(${theme.fontVars.display})`,
              color: theme.colors.ink,
              letterSpacing: "-0.02em",
            }}
          >
            {agent.fullName}
          </NameHeading>
          <p className="text-sm mb-2" style={{ color: theme.colors.accent, fontWeight: 500 }}>
            {agent.title}
          </p>
          {agent.company && (
            <p className="text-sm" style={{ color: theme.colors.inkSoft }}>
              {agent.company}
            </p>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          {agent.phone && (
            <a
              href={`tel:${agent.phone}`}
              className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium"
              style={{
                backgroundColor: theme.colors.accent,
                color: readableTextColor(theme.colors.accent),
              }}
            >
              <Phone className="w-4 h-4" /> Call Me
            </a>
          )}
          {agent.email && (
            <a
              href={`mailto:${agent.email}`}
              className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium"
              style={{ backgroundColor: theme.colors.surface, color: theme.colors.ink }}
            >
              <Mail className="w-4 h-4" /> Email
            </a>
          )}
        </div>

        <SocialLinks agent={agent} theme={theme} tone="on-surface" />
      </div>
    </section>
  );
}

function FullBleedPortraitHero({ agent, theme, resolvedImages, headingLevel = "h1" }: Props) {
  const NameHeading = headingLevel;
  return (
    <section style={{ backgroundColor: theme.colors.background }}>
      <div className="relative w-full aspect-[4/5] md:aspect-[16/9]">
        <div className="absolute inset-0">
          <ProfileImage
            src={agent.avatarUrl}
            alt={agent.fullName}
            fallbackSeed={agent.fullName}
            className="w-full h-full"
            resolvedImages={resolvedImages}
          />
        </div>
        {/* Legibility scrim so the overlaid name/title clear contrast on any photo. */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${theme.colors.background} 0%, transparent 55%)`,
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 md:px-12">
          <NameHeading
            className="text-5xl md:text-6xl font-bold leading-none mb-2"
            style={{
              fontFamily: `var(${theme.fontVars.display})`,
              color: theme.colors.ink,
              letterSpacing: "-0.03em",
            }}
          >
            {agent.fullName}
          </NameHeading>
          <p className="text-base font-semibold" style={{ color: theme.colors.accent }}>
            {agent.title}
          </p>
        </div>
      </div>

      <div className="px-6 md:px-12 py-8">
        {agent.company && (
          <p className="text-sm mb-6" style={{ color: theme.colors.inkSoft }}>
            {agent.company}
          </p>
        )}
        <div className="flex gap-3 flex-wrap">
          {agent.phone && (
            <a
              href={`tel:${agent.phone}`}
              className="flex items-center gap-2 px-5 py-3 rounded-[var(--r-sm)] text-sm font-semibold"
              style={{
                backgroundColor: theme.colors.accent,
                color: readableTextColor(theme.colors.accent),
              }}
            >
              <Phone className="w-4 h-4" /> Call
            </a>
          )}
          {agent.email && (
            <a
              href={`mailto:${agent.email}`}
              className="flex items-center gap-2 px-5 py-3 rounded-[var(--r-sm)] text-sm font-semibold"
              style={{ backgroundColor: theme.colors.surface, color: theme.colors.ink }}
            >
              <Mail className="w-4 h-4" /> Email
            </a>
          )}
        </div>
        <SocialLinks agent={agent} theme={theme} tone="on-surface" />
      </div>
    </section>
  );
}

function StructuredSplitHero({ agent, theme, resolvedImages, headingLevel = "h1" }: Props) {
  const NameHeading = headingLevel;
  return (
    <section style={{ backgroundColor: theme.colors.background }}>
      <div className={measureClass(theme)}>
        <div className="pt-10 pb-6">
          <div className="grid grid-cols-[80px_1fr] gap-5 items-start">
            <div
              className="w-20 h-20 rounded-[var(--r-md)] overflow-hidden"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <ProfileImage
                src={agent.avatarUrl}
                alt={agent.fullName}
                fallbackSeed={agent.fullName}
                className="w-full h-full object-cover"
                resolvedImages={resolvedImages}
              />
            </div>
            <div>
              <NameHeading
                className="text-2xl font-bold mb-1"
                style={{
                  fontFamily: `var(${theme.fontVars.display})`,
                  color: theme.colors.ink,
                  letterSpacing: "-0.02em",
                }}
              >
                {agent.fullName}
              </NameHeading>
              <p className="text-xs font-semibold mb-1" style={{ color: theme.colors.accent }}>
                {agent.title}
              </p>
              {agent.company && (
                <p className="text-sm" style={{ color: theme.colors.inkSoft }}>
                  {agent.company}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            {agent.phone && (
              <a
                href={`tel:${agent.phone}`}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-[var(--r-md)] text-sm font-semibold"
                style={{
                  backgroundColor: theme.colors.accent,
                  color: readableTextColor(theme.colors.accent),
                }}
              >
                <Phone className="w-4 h-4" /> Call
              </a>
            )}
            {agent.email && (
              <a
                href={`mailto:${agent.email}`}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-[var(--r-md)] text-sm font-semibold"
                style={{ backgroundColor: theme.colors.surface, color: theme.colors.ink }}
              >
                <Mail className="w-4 h-4" /> Email
              </a>
            )}
          </div>

          <SocialLinks agent={agent} theme={theme} tone="on-surface" />
        </div>
      </div>
    </section>
  );
}
