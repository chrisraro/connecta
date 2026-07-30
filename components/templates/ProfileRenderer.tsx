"use client";

import { Fragment, ReactNode } from "react";
import { ProfileData } from "@/types/profile";
import { resolveTheme } from "./theme";
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
export function ProfileRenderer({ data, templateId }: { data: ProfileData; templateId: string }) {
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
  const sections: Record<string, (i: number) => ReactNode> = {
    Hero: () => <HeroSection agent={agent} theme={theme} resolvedImages={resolvedImages} />,
    About: (i) => <AboutSection agent={agent} theme={theme} index={i} />,
    Certification: (i) =>
      agent.certification ? <CertificationSection certification={agent.certification} theme={theme} index={i} /> : null,
    Education: (i) =>
      agent.education?.length ? <EducationSection education={agent.education} theme={theme} index={i} /> : null,
    TechStack: (i) =>
      agent.techStack?.length ? <TechStackSection techStack={agent.techStack} theme={theme} index={i} /> : null,
    Services: (i) =>
      agent.services?.length ? <ServicesSection services={agent.services} theme={theme} index={i} /> : null,
    Experience: (i) =>
      agent.experience?.length ? <ExperienceSection experience={agent.experience} theme={theme} index={i} /> : null,
    Projects: (i) => (
      <Fragment>
        {inlineProjects?.length ? <InlineProjectsSection inlineProjects={inlineProjects} theme={theme} index={i} /> : null}
        {projects?.length ? (
          <ProjectsSection projects={projects} theme={theme} index={i} resolvedImages={resolvedImages} />
        ) : null}
      </Fragment>
    ),
    Products: (i) => (products?.length ? <ProductsSection products={products} theme={theme} index={i} /> : null),
    Properties: (i) =>
      propertyListings?.length ? (
        <PropertyListingsSection propertyListings={propertyListings} theme={theme} index={i} />
      ) : null,
    Testimonials: (i) =>
      agent.testimonials?.length ? <TestimonialsSection testimonials={agent.testimonials} theme={theme} index={i} /> : null,
    Gallery: (i) =>
      agent.gallery?.length ? <GallerySection gallery={agent.gallery} theme={theme} index={i} resolvedImages={resolvedImages} /> : null,
    Contact: (i) => <ContactSection theme={theme} index={i} ownerId={ownerId} />,
  };

  // Legacy profiles saved before componentOrder existed fall back to today's
  // hardcoded order (the Object.keys insertion order above).
  const order = componentOrder && componentOrder.length > 0 ? componentOrder : Object.keys(sections);

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.ink,
        fontFamily: `var(${theme.fontVars.body})`,
      }}
    >
      {order.map((id, i) => (
        <Fragment key={id}>{sections[id]?.(i)}</Fragment>
      ))}
      <SaveContactButton agent={agent} theme={theme} />
    </div>
  );
}
