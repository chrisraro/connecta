"use client";

import { Fragment, ReactNode } from "react";
import { ProfileData } from "@/types/profile";
import { resolveTheme } from "./theme";
import { resolveSectionSlots, SectionSlotSpec } from "./sectionSlots";
import { HeroSection } from "./sections/HeroSection";
import { AboutSection } from "./sections/AboutSection";
import { CertificationSection } from "./sections/CertificationSection";
import { EducationSection } from "./sections/EducationSection";
import { TechStackSection } from "./sections/TechStackSection";
import { ServicesSection } from "./sections/ServicesSection";
import { ExperienceSection } from "./sections/ExperienceSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { InlineProjectsSection } from "./sections/InlineProjectsSection";
import { ProductsSection } from "./sections/ProductsSection";
import { PropertyListingsSection } from "./sections/PropertyListingsSection";
import { TestimonialsSection } from "./sections/TestimonialsSection";
import { GallerySection } from "./sections/GallerySection";
import { ContactSection } from "./sections/ContactSection";
import { SaveContactButton } from "./SaveContactButton";

/**
 * The single entry point that replaced Editorial.tsx / Kinetic.tsx /
 * Architectural.tsx (2,687 combined lines, one design copy-pasted three
 * times). Composition — not colour — is what makes the three templates
 * distinct now; see components/templates/theme.ts.
 */
export function ProfileRenderer({
  data,
  templateId,
  headingLevel,
}: {
  data: ProfileData;
  templateId: string;
  /** Forwarded to HeroSection — see its own doc comment. Omit for the real
   *  public profile page (defaults to "h1"); pass "h2" when this renderer is
   *  embedded as a preview inside a page that has its own h1. */
  headingLevel?: "h1" | "h2";
}) {
  const {
    agent,
    projects,
    ownerId,
    products,
    propertyListings,
    inlineProjects,
    componentOrder,
    resolvedImages,
  } = data;

  const theme = resolveTheme(templateId, {
    primaryColor: data.theme.primaryColor,
    backgroundColor: data.theme.backgroundColor,
    textColor: data.theme.textColor,
    secondaryColor: data.theme.secondaryColor,
    accentColor: data.theme.accentColor,
  });

  // Maps a builder block id to the section(s) it renders. Same shape as the
  // pre-refactor per-template sectionRenderers map — order (and whether an
  // id is present at all) is driven by componentOrder (Frontend audit #1).
  //
  // A single componentOrder id can fan out into more than one rendered slot
  // (Projects -> inline projects + regular projects). Numbering is resolved
  // by `resolveSectionSlots` below rather than from componentOrder position,
  // so a hidden/empty section never leaves a gap in the visible numbered
  // sequence, an unnumbered section (Hero, Certification — neither ever
  // displays a number) never offsets it, and sibling slots from the same id
  // get distinct numbers instead of sharing one (Task 2 review, finding #4).
  type SlotDef = { hasContent: boolean; numbered?: boolean; render: (index: number) => ReactNode };
  const slotsById: Record<string, SlotDef[]> = {
    Hero: [
      {
        hasContent: true,
        numbered: false,
        render: () => <HeroSection agent={agent} theme={theme} resolvedImages={resolvedImages} headingLevel={headingLevel} />,
      },
    ],
    About: [
      { hasContent: !!agent.about, render: (i) => <AboutSection agent={agent} theme={theme} index={i} /> },
    ],
    Certification: [
      {
        hasContent: !!agent.certification,
        numbered: false,
        render: (i) =>
          agent.certification ? (
            <CertificationSection certification={agent.certification} theme={theme} index={i} />
          ) : null,
      },
    ],
    Education: [
      {
        hasContent: !!agent.education?.length,
        render: (i) =>
          agent.education?.length ? <EducationSection education={agent.education} theme={theme} index={i} /> : null,
      },
    ],
    TechStack: [
      {
        hasContent: !!agent.techStack?.length,
        render: (i) =>
          agent.techStack?.length ? <TechStackSection techStack={agent.techStack} theme={theme} index={i} /> : null,
      },
    ],
    Services: [
      {
        hasContent: !!agent.services?.length,
        render: (i) =>
          agent.services?.length ? <ServicesSection services={agent.services} theme={theme} index={i} /> : null,
      },
    ],
    Experience: [
      {
        hasContent: !!agent.experience?.length,
        render: (i) =>
          agent.experience?.length ? <ExperienceSection experience={agent.experience} theme={theme} index={i} /> : null,
      },
    ],
    Projects: [
      {
        hasContent: !!inlineProjects?.length,
        render: (i) =>
          inlineProjects?.length ? (
            <InlineProjectsSection inlineProjects={inlineProjects} theme={theme} index={i} />
          ) : null,
      },
      {
        hasContent: !!projects?.length,
        render: (i) =>
          projects?.length ? (
            <ProjectsSection projects={projects} theme={theme} index={i} resolvedImages={resolvedImages} />
          ) : null,
      },
    ],
    Products: [
      {
        hasContent: !!products?.length,
        render: (i) => (products?.length ? <ProductsSection products={products} theme={theme} index={i} /> : null),
      },
    ],
    Properties: [
      {
        hasContent: !!propertyListings?.length,
        render: (i) =>
          propertyListings?.length ? (
            <PropertyListingsSection propertyListings={propertyListings} theme={theme} index={i} />
          ) : null,
      },
    ],
    Testimonials: [
      {
        hasContent: !!agent.testimonials?.length,
        render: (i) =>
          agent.testimonials?.length ? (
            <TestimonialsSection testimonials={agent.testimonials} theme={theme} index={i} />
          ) : null,
      },
    ],
    Gallery: [
      {
        hasContent: !!agent.gallery?.length,
        render: (i) =>
          agent.gallery?.length ? (
            <GallerySection gallery={agent.gallery} theme={theme} index={i} resolvedImages={resolvedImages} />
          ) : null,
      },
    ],
    Contact: [{ hasContent: true, render: (i) => <ContactSection theme={theme} index={i} ownerId={ownerId} /> }],
  };

  // Legacy profiles saved before componentOrder existed fall back to today's
  // hardcoded order (the Object.keys insertion order above).
  const order = componentOrder && componentOrder.length > 0 ? componentOrder : Object.keys(slotsById);

  // Flatten componentOrder into individual slots (Projects -> 2), each
  // tagged with its position among same-id siblings so it can be matched
  // back up after resolveSectionSlots filters/numbers them.
  const flatSlots = order.flatMap((id) =>
    (slotsById[id] ?? []).map((slot, slotIndex) => ({ id, slotIndex, ...slot }))
  );
  const renderByKey = new Map(flatSlots.map((slot) => [`${slot.id}:${slot.slotIndex}`, slot.render]));
  const resolvedSlots = resolveSectionSlots(
    flatSlots.map(({ id, hasContent, numbered }): SectionSlotSpec => ({ id, hasContent, numbered }))
  );

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.ink,
        fontFamily: `var(${theme.fontVars.body})`,
      }}
    >
      {resolvedSlots.map(({ id, slotIndex, index }) => (
        <Fragment key={`${id}-${slotIndex}`}>{renderByKey.get(`${id}:${slotIndex}`)?.(index)}</Fragment>
      ))}
      <SaveContactButton agent={agent} theme={theme} />
    </div>
  );
}
