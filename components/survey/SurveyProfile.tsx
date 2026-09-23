"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Download,
  Facebook,
  Globe,
  Instagram,
  Link as LinkIcon,
  Linkedin,
  Mail,
  Phone,
  QrCode,
  Twitter,
  Youtube,
} from "lucide-react";
import { ProfileImage } from "@/components/templates/ProfileImage";
import { ConnectaMark } from "@/components/brand/ConnectaMark";
import { downloadVCard } from "@/lib/vcard";
import { CONNECTA } from "@/lib/brand";
import type { ProfileData, ProfileInfo } from "@/types/profile";
import type { ProfileCopy } from "./copy";
import type { Sheet } from "./sheet";
import { SurveyLeadForm } from "./SurveyLeadForm";
import styles from "./survey.module.css";

/* ─── Sheet plumbing ─────────────────────────────────────────────────────── */

/** The sheet's colours as custom properties, set once on the page root. */
export function sheetVars(sheet: Sheet): CSSProperties {
  return {
    "--sv-ground": sheet.ground,
    "--sv-ink": sheet.ink,
    "--sv-soft": sheet.soft,
    "--sv-line": sheet.line,
    "--sv-grid": sheet.grid,
    "--sv-mark": sheet.mark,
    "--sv-mark-text": sheet.markText,
    "--sv-action-bg": sheet.actionBg,
    "--sv-action-ink": sheet.actionInk,
    "--sv-duotone": sheet.duotone,
  } as CSSProperties;
}

export const surveyStyles = styles;

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function hostOf(url: string): string {
  try {
    return new URL(normalizeUrl(url)).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/* ─── Portrait: the person inside a surveyed lot ────────────────────────── */

// The lot outline, in a 100 × 120 box: eight corners, 45° chamfers.
const LOT_OUTLINE = "M14 0.75 H86 L99.25 14 V106 L86 119.25 H14 L0.75 106 V14 Z";

function Portrait({ agent }: { agent: ProfileInfo }) {
  return (
    <div className="pt-6 lg:pt-0">
      <div className="relative mx-auto w-full max-w-[420px]" style={{ aspectRatio: "100 / 120" }}>
        <div className={`absolute inset-0 ${styles.lotClip} ${agent.avatarUrl ? styles.duotone : ""}`}>
          {agent.avatarUrl ? (
            <ProfileImage src={agent.avatarUrl} alt={agent.fullName} className="h-full w-full" priority />
          ) : (
            <div
              aria-hidden="true"
              className={`${styles.expanded} flex h-full w-full items-center justify-center text-[72px] font-bold`}
              style={{ color: "var(--sv-line)" }}
            >
              {initials(agent.fullName)}
            </div>
          )}
        </div>
        <svg
          viewBox="0 0 100 120"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <path
            d={LOT_OUTLINE}
            pathLength={1}
            fill="none"
            stroke="var(--sv-line)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            className={styles.drawLot}
          />
        </svg>
      </div>
    </div>
  );
}

/* ─── Title block ────────────────────────────────────────────────────────── */

const SOCIAL_ICONS: Record<string, React.ElementType> = {
  Instagram,
  Facebook,
  LinkedIn: Linkedin,
  Twitter,
  YouTube: Youtube,
  Website: Globe,
};

function TitleBlock({
  agent,
  t,
  headingLevel,
  hasContact,
  onShowQr,
}: {
  agent: ProfileInfo;
  t: ProfileCopy;
  headingLevel: "h1" | "h2";
  hasContact: boolean;
  onShowQr?: () => void;
}) {
  const Heading = headingLevel;
  const first = firstName(agent.fullName);
  const quick: { key: string; href?: string; label: string; icon: React.ElementType; onClick?: () => void }[] = [];
  if (agent.phone) quick.push({ key: "call", href: `tel:${agent.phone.replace(/\s+/g, "")}`, label: t.call, icon: Phone });
  if (agent.email) quick.push({ key: "email", href: `mailto:${agent.email}`, label: t.email, icon: Mail });
  if (agent.website) quick.push({ key: "web", href: normalizeUrl(agent.website), label: t.website, icon: Globe });
  if (onShowQr) quick.push({ key: "qr", label: "QR", icon: QrCode, onClick: onShowQr });

  return (
    <div className="mt-5">
      <div className="border-[1.5px]" style={{ borderColor: "var(--sv-line)" }}>
        <div className="px-4 pb-4 pt-5">
          <Heading
            className={`${styles.expanded} text-[clamp(28px,8.4vw,40px)] font-bold leading-[1.04] tracking-[-0.01em]`}
            style={{ textWrap: "balance" }}
          >
            {agent.fullName}
          </Heading>
          {agent.title && <p className="mt-3 text-[17px] font-medium leading-snug">{agent.title}</p>}
          {agent.company && (
            <p className="mt-1 text-[15px] leading-snug" style={{ color: "var(--sv-soft)" }}>
              {agent.company}
            </p>
          )}
        </div>

        {quick.length > 0 && (
          <div
            className="grid border-t-[1.5px]"
            style={{ gridTemplateColumns: `repeat(${quick.length}, minmax(0, 1fr))`, borderColor: "var(--sv-line)" }}
          >
            {quick.map((q, i) => {
              const Icon = q.icon;
              const inner = (
                <>
                  <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                  <span className="text-[12px] font-semibold">{q.label}</span>
                </>
              );
              const cls = `${styles.cell} flex min-h-16 flex-col items-center justify-center gap-1.5 ${
                i > 0 ? "border-l-[1.5px]" : ""
              }`;
              const style = { borderColor: "var(--sv-line)" };
              return q.href ? (
                <a
                  key={q.key}
                  href={q.href}
                  className={cls}
                  style={style}
                  {...(q.key === "web" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  aria-label={q.key === "web" ? `${t.website} (opens in a new tab)` : undefined}
                >
                  {inner}
                </a>
              ) : (
                <button key={q.key} type="button" onClick={q.onClick} className={cls} style={style} aria-label={t.showQr}>
                  {inner}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => downloadVCard(agent)}
          className={`${styles.primary} ${styles.semiExpanded} flex h-14 w-full items-center justify-center gap-2 text-[17px] font-bold`}
        >
          <Download className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          {t.saveContact}
        </button>
        {hasContact && (
          <a
            href="#leave-details"
            className={`${styles.cell} ${styles.semiExpanded} flex h-14 w-full items-center justify-center border-t-[1.5px] text-[17px] font-bold`}
            style={{ borderColor: "var(--sv-line)" }}
          >
            {t.sendDetails}
          </a>
        )}
      </div>

      {hasContact && (
        <p className="mt-3 text-[13px]" style={{ color: "var(--sv-soft)" }}>
          {t.detailsPrivate(first)}
        </p>
      )}
    </div>
  );
}

/** Social links as surveyed rows: no boxes, a rule between each. */
function LinkRows({ agent, t }: { agent: ProfileInfo; t: ProfileCopy }) {
  const socials = (agent.socialLinks ?? []).filter((s) => s.url && s.platform !== "Website");
  if (socials.length === 0) return null;
  return (
    <ul className="mt-6 border-t-[1.5px]" style={{ borderColor: "var(--sv-line)" }} aria-label={t.links}>
      {socials.map((s, i) => {
        const Icon = SOCIAL_ICONS[s.platform] ?? LinkIcon;
        return (
          <li key={`${s.platform}-${i}`} className={`border-b ${styles.rule}`}>
            <a
              href={normalizeUrl(s.url)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.cell} flex min-h-12 items-center gap-3 px-1`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} aria-hidden="true" />
              <span className="text-[16px] font-semibold">{s.platform}</span>
              <span className="min-w-0 flex-1 truncate text-right text-[13px]" style={{ color: "var(--sv-soft)" }}>
                {hostOf(s.url)}
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/* ─── Lots: every section is a surveyed parcel ───────────────────────────── */

/**
 * One parcel on the plan. Neighbouring lots share their boundary line (each
 * lot draws only its top edge; the plan draws the outer edges once), and the
 * heading sits on the line the way a lot label sits on a survey plan.
 */
function Lot({ id, heading, children }: { id: string; heading: string; children: ReactNode }) {
  const headingId = `lot-${id}`;
  return (
    <section
      aria-labelledby={headingId}
      className="relative border-t-[1.5px] px-4 pb-7 pt-8"
      style={{ borderColor: "var(--sv-line)" }}
      id={id === "contact" ? "leave-details" : undefined}
    >
      <h2
        id={headingId}
        className={`${styles.semiExpanded} absolute left-3 top-0 -translate-y-1/2 px-2 text-[19px] font-bold leading-none`}
        style={{ backgroundColor: "var(--sv-ground)" }}
      >
        {heading}
      </h2>
      {children}
    </section>
  );
}

/** The plan the lots sit on: outer boundary drawn once, one chamfered corner. */
function LotPlan({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative mt-10 border-x-[1.5px] border-b-[1.5px] ${className}`} style={{ borderColor: "var(--sv-line)" }}>
      {children}
      {/* The chamfer: a ground-coloured mask hides the square corner, and the
          45° boundary is drawn across it. */}
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" className="absolute -bottom-[1.5px] -right-[1.5px]">
        <path d="M24 0 V24 H0 Z" fill="var(--sv-ground)" />
        <path d="M23.25 0 L0 23.25" fill="none" stroke="var(--sv-line)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

/** An empty section, shown only in the owner's own preview: a dashed lot that
 *  hasn't been surveyed yet. Visitors never see empty sections. */
function UnsurveyedLot({ heading, t }: { heading: string; t: ProfileCopy }) {
  return (
    <section className="relative border-t-[1.5px] border-dashed px-4 pb-7 pt-8" style={{ borderColor: "var(--sv-line)" }}>
      <p
        className={`${styles.semiExpanded} absolute left-3 top-0 -translate-y-1/2 px-2 text-[19px] font-bold leading-none`}
        style={{ backgroundColor: "var(--sv-ground)" }}
      >
        {heading}
      </p>
      <p className="text-[14px]" style={{ color: "var(--sv-soft)" }}>
        {t.unsurveyed}
      </p>
    </section>
  );
}

function Rows({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col">{children}</ul>;
}

function Row({ children }: { children: ReactNode }) {
  return <li className={`border-b py-3.5 first:pt-0 ${styles.rule}`}>{children}</li>;
}

type SheetItem = {
  title: string;
  image?: string;
  meta?: string;
  sub?: string;
  tag?: string;
  link?: string;
  description?: string;
};

/**
 * Listings as a row of plan sheets that scroll sideways. Photos stay in true colour, because a
 * buyer judging a house needs its real colours.
 */
function Sheets({ items, t }: { items: SheetItem[]; t: ProfileCopy }) {
  return (
    <ul className={`${styles.strip} flex gap-3 overflow-x-auto pb-2`}>
      {items.map((item, i) => (
        <li
          key={`${item.title}-${i}`}
          className="relative w-[80%] max-w-[340px] shrink-0"
        >
          <div className="mb-2 flex min-h-6 items-center justify-end gap-3">
            {item.tag && (
              <span
                className={`${styles.mono} shrink-0 border px-2 py-0.5 text-[11px] uppercase`}
                style={{ borderColor: "var(--sv-mark)", color: "var(--sv-mark-text)" }}
              >
                {item.tag}
              </span>
            )}
          </div>
          {item.image && (
            <div className={`${styles.frameClip} aspect-[4/3] w-full`}>
              <ProfileImage src={item.image} alt={item.title} className="h-full w-full" />
            </div>
          )}
          <h3 className="mt-3 text-[17px] font-bold leading-snug">{item.title}</h3>
          {item.meta && <p className={`${styles.mono} mt-1 text-[15px]`}>{item.meta}</p>}
          {item.sub && (
            <p className="mt-1 text-[14px]" style={{ color: "var(--sv-soft)" }}>
              {item.sub}
            </p>
          )}
          {item.description && (
            <p className="mt-2 line-clamp-3 text-[14px] leading-relaxed" style={{ color: "var(--sv-soft)" }}>
              {item.description}
            </p>
          )}
          {item.link && (
            <a
              href={normalizeUrl(item.link)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.link} mt-1 inline-flex min-h-11 items-center gap-1 text-[14px] font-semibold`}
            >
              {t.view}
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span className="sr-only">{item.title} (opens in a new tab)</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

function formatPeso(price: number): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(price);
}

/* ─── The profile ────────────────────────────────────────────────────────── */

const DEFAULT_ORDER = [
  "About",
  "Services",
  "Properties",
  "Projects",
  "Products",
  "Experience",
  "Education",
  "Certification",
  "TechStack",
  "Testimonials",
  "Gallery",
  "Contact",
];

/**
 * The public profile in the Survey Plan world: the person's portrait inside a
 * surveyed lot on a drafting-grid sheet, a title block with the actions, and
 * one section per builder block.
 * Section order and visibility follow the owner's componentOrder. On desktop
 * the whole page becomes one plan sheet inside a double neatline, with the
 * plan and title block held on the left while the sections scroll.
 */
export function SurveyProfile({
  data,
  t,
  headingLevel = "h1",
  onShowQr,
  showEmpty = false,
}: {
  data: ProfileData;
  t: ProfileCopy;
  headingLevel?: "h1" | "h2";
  onShowQr?: () => void;
  /** Owner-facing previews only: render empty sections as unsurveyed lots. */
  showEmpty?: boolean;
}) {
  const { agent } = data;
  const order = (data.componentOrder?.length ? data.componentOrder : DEFAULT_ORDER).filter((id) => id !== "Hero");
  const hasContact = order.includes("Contact");
  const first = firstName(agent.fullName);

  const headings: Record<string, string> = {
    About: t.about,
    Services: t.services,
    Properties: t.listings,
    Projects: t.projects,
    Products: t.products,
    Experience: t.experience,
    Education: t.education,
    Certification: t.certification,
    TechStack: t.skills,
    Testimonials: t.testimonials,
    Gallery: t.gallery,
    Contact: t.contactHeading,
  };

  const lots: Record<string, () => ReactNode> = {
    About: () =>
      agent.about ? (
        <Lot id="about" heading={t.about}>
          <p className="max-w-[62ch] whitespace-pre-line text-[17px] leading-[1.65]">{agent.about}</p>
        </Lot>
      ) : null,
    Services: () =>
      agent.services?.length ? (
        <Lot id="services" heading={t.services}>
          <Rows>
            {agent.services.map((s, i) => (
              <Row key={`${s}-${i}`}>
                <span className="flex items-center gap-3 text-[17px] font-medium">
                  <span aria-hidden="true" className="h-2 w-2 shrink-0" style={{ backgroundColor: "var(--sv-line)" }} />
                  {s}
                </span>
              </Row>
            ))}
          </Rows>
        </Lot>
      ) : null,
    Properties: () =>
      data.propertyListings?.length ? (
        <Lot id="listings" heading={t.listings}>
          <Sheets
            t={t}
            items={data.propertyListings.map((p) => ({
              title: p.title,
              image: p.image,
              meta: p.price,
              sub: p.location,
              tag: p.status,
              link: p.link,
              description: p.description,
            }))}
          />
        </Lot>
      ) : null,
    Projects: () =>
      data.inlineProjects?.length ? (
        <Lot id="projects" heading={t.projects}>
          <Sheets
            t={t}
            items={data.inlineProjects.map((p) => ({
              title: p.title,
              image: p.image,
              sub: p.category,
              link: p.link,
              description: p.description,
            }))}
          />
        </Lot>
      ) : null,
    Products: () =>
      data.products?.length ? (
        <Lot id="products" heading={t.products}>
          <Sheets
            t={t}
            items={data.products.map((p) => ({
              title: p.title,
              image: p.image,
              meta: typeof p.price === "number" ? formatPeso(p.price) : undefined,
              link: p.link,
              description: p.description,
            }))}
          />
        </Lot>
      ) : null,
    Experience: () =>
      agent.experience?.length ? (
        <Lot id="experience" heading={t.experience}>
          <Rows>
            {agent.experience.map((e, i) => (
              <Row key={`${e.title}-${i}`}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="min-w-0 text-[17px] font-semibold leading-snug">{e.title}</p>
                  <p className={`${styles.mono} shrink-0 text-[12px]`} style={{ color: "var(--sv-soft)" }}>
                    {e.period}
                  </p>
                </div>
                <p className="text-[15px]" style={{ color: "var(--sv-soft)" }}>
                  {e.company}
                </p>
                {e.description && <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed">{e.description}</p>}
              </Row>
            ))}
          </Rows>
        </Lot>
      ) : null,
    Education: () =>
      agent.education?.length ? (
        <Lot id="education" heading={t.education}>
          <Rows>
            {agent.education.map((e, i) => (
              <Row key={`${e.degree}-${i}`}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="min-w-0 text-[17px] font-semibold leading-snug">{e.degree}</p>
                  {e.year && (
                    <p className={`${styles.mono} shrink-0 text-[12px]`} style={{ color: "var(--sv-soft)" }}>
                      {e.year}
                    </p>
                  )}
                </div>
                <p className="text-[15px]" style={{ color: "var(--sv-soft)" }}>
                  {e.school}
                </p>
              </Row>
            ))}
          </Rows>
        </Lot>
      ) : null,
    Certification: () =>
      agent.certification ? (
        <Lot id="certification" heading={t.certification}>
          <p className="text-[17px] font-semibold">{agent.certification.title}</p>
          {agent.certification.description && (
            <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed" style={{ color: "var(--sv-soft)" }}>
              {agent.certification.description}
            </p>
          )}
        </Lot>
      ) : null,
    TechStack: () =>
      agent.techStack?.length ? (
        <Lot id="skills" heading={t.skills}>
          <Rows>
            {agent.techStack.map((g, i) => (
              <Row key={`${g.category}-${i}`}>
                <p className="text-[15px] font-semibold">{g.category}</p>
                <p className="mt-1 text-[15px] leading-relaxed" style={{ color: "var(--sv-soft)" }}>
                  {g.skills.join(" · ")}
                </p>
              </Row>
            ))}
          </Rows>
        </Lot>
      ) : null,
    Testimonials: () =>
      agent.testimonials?.length ? (
        <Lot id="testimonials" heading={t.testimonials}>
          <div className="flex flex-col gap-8">
            {agent.testimonials.map((q, i) => (
              <figure key={`${q.author}-${i}`}>
                <blockquote className="max-w-[62ch] text-[19px] font-medium leading-[1.5]">“{q.quote}”</blockquote>
                <figcaption className={`${styles.mono} mt-3 text-[12px]`} style={{ color: "var(--sv-soft)" }}>
                  {q.author}
                  {q.role ? ` · ${q.role}` : ""}
                </figcaption>
              </figure>
            ))}
          </div>
        </Lot>
      ) : null,
    Gallery: () =>
      agent.gallery?.length ? (
        <Lot id="gallery" heading={t.gallery}>
          <ul className="grid grid-cols-2 gap-3">
            {agent.gallery.map((src, i) => (
              <li key={`${src}-${i}`} className={`${styles.frameClip} ${styles.duotone} aspect-square`}>
                <ProfileImage src={src} alt={`${agent.fullName} — ${t.gallery} ${i + 1}`} className="h-full w-full" />
              </li>
            ))}
          </ul>
        </Lot>
      ) : null,
    Contact: () => (
      <Lot id="contact" heading={t.contactHeading}>
        <p className="mb-6 max-w-[62ch] text-[16px] leading-relaxed" style={{ color: "var(--sv-soft)" }}>
          {t.contactIntro(first)}
        </p>
        <SurveyLeadForm ownerId={data.ownerId} firstName={first} t={t} />
      </Lot>
    ),
  };

  return (
    <main
      className={`${styles.neatline} mx-auto w-full max-w-[560px] flex-1 px-4 pb-16 lg:mb-6 lg:mt-10 lg:max-w-[1180px] lg:px-14 lg:pb-14 lg:pt-14`}
    >
      <div className="lg:grid lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-x-16">
        <div>
          <Portrait agent={agent} />
          <TitleBlock agent={agent} t={t} headingLevel={headingLevel} hasContact={hasContact} onShowQr={onShowQr} />
          <LinkRows agent={agent} t={t} />
          {hasContact && <LotPlan className="hidden lg:block">{lots.Contact()}</LotPlan>}
        </div>

        <LotPlan className="min-w-0 lg:mt-3 lg:max-w-[640px]">
          {order.map((id) => {
            const render = lots[id];
            if (!render) return null;
            if (id === "Contact") return <div key={id} className="lg:hidden">{render()}</div>;
            const lot = render();
            if (lot) return <div key={id}>{lot}</div>;
            return showEmpty && headings[id] ? <UnsurveyedLot key={id} heading={headings[id]} t={t} /> : null;
          })}
        </LotPlan>
      </div>
    </main>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────── */

export function SurveyFooter({ sheet, t }: { sheet: Sheet; t: ProfileCopy }) {
  return (
    <footer className="mx-auto w-full max-w-[560px] px-4 pb-10 lg:max-w-[1180px] lg:px-0">
      <Link
        href="/"
        className={`${styles.cell} flex min-h-12 items-center justify-center gap-2 border-t-[1.5px] pt-4 text-[13px] lg:border-t-0`}
        style={{ borderColor: "var(--sv-line)", color: "var(--sv-soft)" }}
      >
        <span>{t.poweredBy}</span>
        <ConnectaMark className="h-5 w-5" dotColor={sheet.mark} style={{ color: sheet.line }} />
        <span className={`${styles.expanded} font-bold tracking-[0.1em]`} style={{ color: "var(--sv-ink)" }}>
          {CONNECTA.name.toUpperCase()}
        </span>
      </Link>
    </footer>
  );
}
