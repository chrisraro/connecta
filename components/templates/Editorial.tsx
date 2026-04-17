"use client";

import { TemplateProps } from "@/types/profile";
import {
  Phone, Mail, Globe, MapPin, Download, Facebook, Instagram, Linkedin, Twitter, Youtube,
  Link as LinkIcon, Briefcase, GraduationCap, Code, Quote, Image as ImageIcon, Send,
  ChevronRight, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadVCard } from "@/lib/vcard";
import { resolveImageUrl } from "@/lib/utils";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2 } from "lucide-react";
import { SaveContactButton } from "./SaveContactButton";
import { ProfileImage } from "./ProfileImage";

const SOCIAL_ICONS: Record<string, React.ElementType> = {
  "Instagram": Instagram,
  "Facebook": Facebook,
  "LinkedIn": Linkedin,
  "Twitter": Twitter,
  "TikTok": LinkIcon,
  "YouTube": Youtube,
  "Website": Globe
};

// Editorial Design System Colors
const COLORS = {
  background: "#fbf9f4",
  surface: "#f5f3ee",
  surfaceContainer: "#f0eee9",
  surfaceContainerLowest: "#ffffff",
  primary: "#705838",
  primaryContainer: "#e7dfcc",
  onSurface: "#1b1c19",
  outlineVariant: "#d1c4b8",
};

export default function Editorial({ data }: TemplateProps) {
  const { agent, theme, projects, ownerId } = data;

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
        fontFamily: "'Manrope', sans-serif",
      }}
    >
      <HeroSection agent={agent} theme={theme} />
      <AboutSection agent={agent} theme={theme} />
      {agent.certification && <CertificationSection certification={agent.certification} theme={theme} />}
      {agent.education && agent.education.length > 0 && <EducationSection education={agent.education} theme={theme} />}
      {agent.techStack && agent.techStack.length > 0 && <TechStackSection techStack={agent.techStack} theme={theme} />}
      {agent.services && agent.services.length > 0 && <ServicesSection services={agent.services} theme={theme} />}
      {agent.experience && agent.experience.length > 0 && <ExperienceSection experience={agent.experience} theme={theme} />}
      {projects && projects.length > 0 && <ProjectsSection projects={projects} theme={theme} />}
      {agent.testimonials && agent.testimonials.length > 0 && <TestimonialsSection testimonials={agent.testimonials} theme={theme} />}
      {agent.gallery && agent.gallery.length > 0 && <GallerySection gallery={agent.gallery} theme={theme} />}
      <ContactSection theme={theme} ownerId={ownerId} />
      <SaveContactButton agent={agent} theme={theme} variant="editorial" />
    </div>
  );
}

// ─── Hero Section ────────────────────────────────────────────────────────────

function HeroSection({ agent, theme }: { agent: TemplateProps["data"]["agent"]; theme: TemplateProps["data"]["theme"] }) {
  return (
    <section className="px-6 pt-12 pb-8" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="max-w-md mx-auto">
        {/* Asymmetric Profile Image */}
        <div className="flex justify-start mb-8 ml-4">
          <div
            className="w-32 h-32 rounded-2xl overflow-hidden shadow-lg"
            style={{
              backgroundColor: COLORS.surfaceContainerLowest,
              boxShadow: "0 20px 40px rgba(27, 28, 25, 0.06)",
            }}
          >
            <ProfileImage
              src={agent.avatarUrl}
              alt={agent.fullName}
              fallbackSeed={agent.fullName}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Name & Title - Editorial Typography */}
        <div className="mb-8">
          <h1
            className="text-4xl font-normal mb-3 leading-tight"
            style={{
              fontFamily: "'Noto Serif', serif",
              color: theme.textColor,
              letterSpacing: "-0.02em",
            }}
          >
            {agent.fullName}
          </h1>
          <p
            className="text-sm uppercase tracking-widest mb-2"
            style={{ color: theme.primaryColor, fontWeight: 500 }}
          >
            {agent.title}
          </p>
          {agent.company && (
            <p className="text-sm" style={{ color: `${theme.textColor}80` }}>
              {agent.company}
            </p>
          )}
        </div>

        {/* Action Buttons - Glassmorphism */}
        <div className="flex gap-3 flex-wrap">
          {agent.phone && (
            <a
              href={`tel:${agent.phone}`}
              className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: theme.primaryColor,
                color: "#ffffff",
              }}
            >
              <Phone className="w-4 h-4" />
              Call Me
            </a>
          )}
          {agent.email && (
            <a
              href={`mailto:${agent.email}`}
              className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: `${theme.textColor}08`,
                color: theme.textColor,
              }}
            >
              <Mail className="w-4 h-4" />
              Email
            </a>
          )}
        </div>

        {/* Social Links */}
        {agent.socialLinks && agent.socialLinks.length > 0 && (
          <div className="flex gap-3 mt-8">
            {agent.socialLinks.map((link, i) => {
              const Icon = SOCIAL_ICONS[link.platform] || LinkIcon;
              return (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: COLORS.surfaceContainer,
                    color: theme.textColor,
                  }}
                >
                  <Icon className="w-4 h-4" />
                </a>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── About Section ───────────────────────────────────────────────────────────

function AboutSection({ agent, theme }: { agent: TemplateProps["data"]["agent"]; theme: TemplateProps["data"]["theme"] }) {
  if (!agent.about) return null;

  return (
    <section
      className="px-6 py-10"
      style={{ backgroundColor: COLORS.surfaceContainer }}
    >
      <div className="max-w-md mx-auto">
        <h2
          className="text-2xl font-normal mb-4"
          style={{
            fontFamily: "'Noto Serif', serif",
            color: theme.textColor,
          }}
        >
          About
        </h2>
        <p
          className="text-base leading-relaxed"
          style={{ color: `${theme.textColor}cc`, lineHeight: "1.7" }}
        >
          {agent.about}
        </p>
      </div>
    </section>
  );
}

// ─── Certification Section ───────────────────────────────────────────────────

function CertificationSection({ certification, theme }: { certification: NonNullable<TemplateProps["data"]["agent"]["certification"]>; theme: TemplateProps["data"]["theme"] }) {
  return (
    <section className="px-6 py-8">
      <div className="max-w-md mx-auto">
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: COLORS.surfaceContainerLowest,
            boxShadow: "0 20px 40px rgba(27, 28, 25, 0.06)",
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${theme.primaryColor}15` }}
            >
              <Briefcase className="w-6 h-6" style={{ color: theme.primaryColor }} />
            </div>
            <div>
              <h3
                className="font-medium text-base mb-1"
                style={{ fontFamily: "'Noto Serif', serif" }}
              >
                {certification.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: `${theme.textColor}99` }}>
                {certification.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Education Section ───────────────────────────────────────────────────────

function EducationSection({ education, theme }: { education: NonNullable<TemplateProps["data"]["agent"]["education"]>; theme: TemplateProps["data"]["theme"] }) {
  return (
    <section className="px-6 py-10" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="max-w-md mx-auto">
        <h2
          className="text-2xl font-normal mb-6"
          style={{
            fontFamily: "'Noto Serif', serif",
            color: theme.textColor,
          }}
        >
          Education
        </h2>
        <div className="space-y-6">
          {education.map((edu, i) => (
            <div key={i} className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: COLORS.surfaceContainer }}
              >
                <GraduationCap className="w-5 h-5" style={{ color: theme.primaryColor }} />
              </div>
              <div>
                <h3 className="font-medium text-sm" style={{ color: theme.textColor }}>
                  {edu.degree}
                </h3>
                <p className="text-sm mt-1" style={{ color: `${theme.textColor}80` }}>
                  {edu.school}
                </p>
                {edu.year && (
                  <p className="text-xs mt-1" style={{ color: `${theme.textColor}60` }}>
                    {edu.year}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Tech Stack Section ──────────────────────────────────────────────────────

function TechStackSection({ techStack, theme }: { techStack: NonNullable<TemplateProps["data"]["agent"]["techStack"]>; theme: TemplateProps["data"]["theme"] }) {
  return (
    <section className="px-6 py-10" style={{ backgroundColor: COLORS.surfaceContainer }}>
      <div className="max-w-md mx-auto">
        <h2
          className="text-2xl font-normal mb-6"
          style={{
            fontFamily: "'Noto Serif', serif",
            color: theme.textColor,
          }}
        >
          Tech Stack
        </h2>
        <div className="space-y-6">
          {techStack.map((stack, i) => (
            <div key={i}>
              <h3
                className="text-xs uppercase tracking-widest mb-3"
                style={{ color: `${theme.textColor}60`, fontWeight: 500 }}
              >
                {stack.category}
              </h3>
              <div className="flex flex-wrap gap-2">
                {stack.skills.map((skill, j) => (
                  <span
                    key={j}
                    className="px-4 py-2 rounded-full text-xs"
                    style={{
                      backgroundColor: COLORS.surfaceContainerLowest,
                      color: theme.textColor,
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Services Section ────────────────────────────────────────────────────────

function ServicesSection({ services, theme }: { services: NonNullable<TemplateProps["data"]["agent"]["services"]>; theme: TemplateProps["data"]["theme"] }) {
  return (
    <section className="px-6 py-10" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="max-w-md mx-auto">
        <h2
          className="text-2xl font-normal mb-6"
          style={{
            fontFamily: "'Noto Serif', serif",
            color: theme.textColor,
          }}
        >
          Services
        </h2>
        <div className="flex flex-wrap gap-3">
          {services.map((service, i) => (
            <span
              key={i}
              className="px-5 py-2.5 rounded-full text-sm"
              style={{
                backgroundColor: COLORS.primaryContainer,
                color: COLORS.primary,
              }}
            >
              {service}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Experience Section ──────────────────────────────────────────────────────

function ExperienceSection({ experience, theme }: { experience: NonNullable<TemplateProps["data"]["agent"]["experience"]>; theme: TemplateProps["data"]["theme"] }) {
  return (
    <section className="px-6 py-10" style={{ backgroundColor: COLORS.surfaceContainer }}>
      <div className="max-w-md mx-auto">
        <h2
          className="text-2xl font-normal mb-6"
          style={{
            fontFamily: "'Noto Serif', serif",
            color: theme.textColor,
          }}
        >
          Experience
        </h2>
        <div className="space-y-8">
          {experience.map((exp, i) => (
            <div key={i} className="relative pl-6">
              {/* Accent bar */}
              <div
                className="absolute left-0 top-1 w-1 h-full rounded-full"
                style={{
                  backgroundColor: i === 0 ? theme.primaryColor : `${theme.primaryColor}30`,
                }}
              />
              <div>
                <h3
                  className="font-medium text-base mb-1"
                  style={{ color: theme.textColor }}
                >
                  {exp.title}
                </h3>
                <p className="text-sm" style={{ color: `${theme.textColor}80` }}>
                  {exp.company}
                </p>
                <p className="text-xs mt-1" style={{ color: `${theme.textColor}60` }}>
                  {exp.period}
                </p>
                {exp.description && (
                  <p className="text-sm mt-3 leading-relaxed" style={{ color: `${theme.textColor}99` }}>
                    {exp.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Projects Section ────────────────────────────────────────────────────────

function ProjectsSection({ projects, theme }: { projects: TemplateProps["data"]["projects"]; theme: TemplateProps["data"]["theme"] }) {
  return (
    <section className="px-6 py-10" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-2xl font-normal"
            style={{
              fontFamily: "'Noto Serif', serif",
              color: theme.textColor,
            }}
          >
            Recent Work
          </h2>
        </div>
        <div className="space-y-6">
          {projects.slice(0, 3).map((project, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: COLORS.surfaceContainerLowest,
                boxShadow: "0 20px 40px rgba(27, 28, 25, 0.06)",
              }}
            >
              {project.images && project.images[0] && (
                <div className="aspect-video bg-muted">
                  <ProfileImage
                    src={project.images[0]}
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-5">
                <h3
                  className="font-medium text-base mb-2"
                  style={{ fontFamily: "'Noto Serif', serif" }}
                >
                  {project.title}
                </h3>
                {project.description && (
                  <p className="text-sm leading-relaxed mb-4" style={{ color: `${theme.textColor}80` }}>
                    {project.description}
                  </p>
                )}
                {project.externalUrl && (
                  <a
                    href={project.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm flex items-center gap-1 font-medium"
                    style={{ color: theme.primaryColor }}
                  >
                    View Project <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials Section ────────────────────────────────────────────────────

function TestimonialsSection({ testimonials, theme }: { testimonials: NonNullable<TemplateProps["data"]["agent"]["testimonials"]>; theme: TemplateProps["data"]["theme"] }) {
  return (
    <section className="px-6 py-10" style={{ backgroundColor: COLORS.surfaceContainer }}>
      <div className="max-w-md mx-auto">
        <h2
          className="text-2xl font-normal mb-6"
          style={{
            fontFamily: "'Noto Serif', serif",
            color: theme.textColor,
          }}
        >
          Recommendations
        </h2>
        <div className="space-y-6">
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              className="rounded-2xl p-6"
              style={{ backgroundColor: COLORS.surfaceContainerLowest }}
            >
              <Quote className="w-8 h-8 mb-4" style={{ color: `${theme.primaryColor}40` }} />
              <p
                className="text-base leading-relaxed mb-4 italic"
                style={{ color: theme.textColor, fontFamily: "'Noto Serif', serif" }}
              >
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div>
                <p className="text-sm font-medium" style={{ color: theme.textColor }}>
                  {testimonial.author}
                </p>
                {testimonial.role && (
                  <p className="text-xs mt-0.5" style={{ color: `${theme.textColor}60` }}>
                    {testimonial.role}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Gallery Section ─────────────────────────────────────────────────────────

function GallerySection({ gallery, theme }: { gallery: NonNullable<TemplateProps["data"]["agent"]["gallery"]>; theme: TemplateProps["data"]["theme"] }) {
  return (
    <section className="px-6 py-10" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="max-w-md mx-auto">
        <h2
          className="text-2xl font-normal mb-6"
          style={{
            fontFamily: "'Noto Serif', serif",
            color: theme.textColor,
          }}
        >
          Gallery
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {gallery.slice(0, 6).map((img, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl overflow-hidden"
              style={{ backgroundColor: COLORS.surfaceContainer }}
            >
              <ProfileImage
                src={img}
                alt={`Gallery ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Contact Section ─────────────────────────────────────────────────────────

function ContactSection({ theme, ownerId }: { theme: TemplateProps["data"]["theme"]; ownerId: string }) {
  const createLead = useMutation(api.leads.createLead);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createLead({
        ownerId: ownerId as Id<"users">,
        inquirerName: form.name,
        inquirerContact: form.email,
        message: form.message,
      });
      setIsSuccess(true);
      setForm({ name: "", email: "", message: "" });
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      console.error(error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="px-6 py-12" style={{ backgroundColor: COLORS.surfaceContainer }}>
      <div className="max-w-md mx-auto">
        <h2
          className="text-2xl font-normal mb-2"
          style={{
            fontFamily: "'Noto Serif', serif",
            color: theme.textColor,
          }}
        >
          Get In Touch
        </h2>
        <p className="text-sm mb-8" style={{ color: `${theme.textColor}80` }}>
          I&apos;m always interested in hearing about new projects and opportunities.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              className="text-xs uppercase tracking-widest mb-2 block"
              style={{ color: `${theme.textColor}60`, fontWeight: 500 }}
            >
              Name
            </label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
              className="h-12 border-0"
              style={{
                backgroundColor: COLORS.surfaceContainerLowest,
                color: theme.textColor,
              }}
            />
          </div>
          <div>
            <label
              className="text-xs uppercase tracking-widest mb-2 block"
              style={{ color: `${theme.textColor}60`, fontWeight: 500 }}
            >
              Email
            </label>
            <Input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="your@email.com"
              className="h-12 border-0"
              style={{
                backgroundColor: COLORS.surfaceContainerLowest,
                color: theme.textColor,
              }}
            />
          </div>
          <div>
            <label
              className="text-xs uppercase tracking-widest mb-2 block"
              style={{ color: `${theme.textColor}60`, fontWeight: 500 }}
            >
              Message
            </label>
            <Textarea
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Tell me about your project..."
              className="min-h-[120px] resize-none border-0"
              style={{
                backgroundColor: COLORS.surfaceContainerLowest,
                color: theme.textColor,
              }}
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || isSuccess}
            className="w-full h-12 font-medium rounded-lg border-0"
            style={{
              backgroundColor: isSuccess ? "#22c55e" : theme.primaryColor,
              color: "#ffffff",
            }}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isSuccess ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Message Sent
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" /> Send Message
              </span>
            )}
          </Button>
        </form>
      </div>
    </section>
  );
}
