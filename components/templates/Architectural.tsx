"use client";

import { TemplateProps } from "@/types/profile";
import {
  Phone, Mail, Globe, MapPin, Download, Facebook, Instagram, Linkedin, Twitter, Youtube,
  Link as LinkIcon, Briefcase, GraduationCap, Code, Quote, Image as ImageIcon, Send,
  ChevronRight, ExternalLink, Award
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

const SOCIAL_ICONS: Record<string, React.ElementType> = {
  "Instagram": Instagram,
  "Facebook": Facebook,
  "LinkedIn": Linkedin,
  "Twitter": Twitter,
  "TikTok": LinkIcon,
  "YouTube": Youtube,
  "Website": Globe
};

// Architectural Design System Colors
const COLORS = {
  background: "#f7f9fb",
  surface: "#f2f4f6",
  surfaceContainer: "#e6e8ea",
  surfaceContainerHigh: "#ffffff",
  primary: "#00193c",
  primaryContainer: "#002d62",
  primaryFixed: "#d7e2ff",
  onSurface: "#191c1e",
  outlineVariant: "#c1c7ce",
};

export default function Architectural({ data }: TemplateProps) {
  const { agent, theme, projects, ownerId } = data;

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
        fontFamily: "'Inter', sans-serif",
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
    </div>
  );
}

// ─── Hero Section ────────────────────────────────────────────────────────────

function HeroSection({ agent, theme }: { agent: TemplateProps["data"]["agent"]; theme: TemplateProps["data"]["theme"] }) {
  return (
    <section
      className="px-6 pt-10 pb-8"
      style={{ backgroundColor: COLORS.surfaceContainerHigh }}
    >
      <div className="max-w-md mx-auto">
        {/* Profile Card with glass effect */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            backgroundColor: COLORS.surfaceContainerHigh,
            boxShadow: "0 20px 40px rgba(25, 28, 30, 0.06)",
          }}
        >
          <div className="flex items-start gap-5">
            {/* Profile Image */}
            <div
              className="w-20 h-20 rounded-xl overflow-hidden shrink-0"
              style={{ backgroundColor: COLORS.surface }}
            >
              <img
                src={resolveImageUrl(agent.avatarUrl) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${agent.fullName}`}
                alt={agent.fullName}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Name & Title */}
            <div className="flex-1 pt-1">
              <h1
                className="text-2xl font-extrabold mb-1"
                style={{
                  fontFamily: "'Manrope', sans-serif",
                  color: theme.textColor,
                  letterSpacing: "-0.02em",
                }}
              >
                {agent.fullName}
              </h1>
              <p
                className="text-xs uppercase tracking-[0.15em] mb-1"
                style={{ color: theme.primaryColor, fontWeight: 600 }}
              >
                {agent.title}
              </p>
              {agent.company && (
                <p className="text-sm" style={{ color: `${theme.textColor}70` }}>
                  {agent.company}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            {agent.phone && (
              <a
                href={`tel:${agent.phone}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: `linear-gradient(135deg, ${theme.primaryColor}, ${COLORS.primaryContainer})`,
                  color: "#ffffff",
                }}
              >
                <Phone className="w-4 h-4" />
                Call
              </a>
            )}
            {agent.email && (
              <a
                href={`mailto:${agent.email}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: COLORS.surfaceContainer,
                  color: theme.textColor,
                }}
              >
                <Mail className="w-4 h-4" />
                Email
              </a>
            )}
          </div>
        </div>

        {/* Social Links */}
        {agent.socialLinks && agent.socialLinks.length > 0 && (
          <div className="flex gap-2 justify-center">
            {agent.socialLinks.map((link, i) => {
              const Icon = SOCIAL_ICONS[link.platform] || LinkIcon;
              return (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: COLORS.surface,
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
      className="px-6 py-8"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      <div className="max-w-md mx-auto">
        <h2
          className="text-xl font-extrabold mb-4"
          style={{
            fontFamily: "'Manrope', sans-serif",
            color: theme.textColor,
            letterSpacing: "-0.02em",
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
    <section className="px-6 py-6" style={{ backgroundColor: COLORS.surface }}>
      <div className="max-w-md mx-auto">
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: COLORS.primaryFixed,
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${theme.primaryColor}15` }}
            >
              <Award className="w-5 h-5" style={{ color: theme.primaryColor }} />
            </div>
            <div>
              <h3
                className="font-bold text-sm mb-1"
                style={{ color: theme.primaryColor }}
              >
                {certification.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: `${theme.primaryColor}cc` }}>
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
    <section className="px-6 py-8" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="max-w-md mx-auto">
        <h2
          className="text-xl font-extrabold mb-5"
          style={{
            fontFamily: "'Manrope', sans-serif",
            color: theme.textColor,
            letterSpacing: "-0.02em",
          }}
        >
          Education
        </h2>
        <div className="space-y-4">
          {education.map((edu, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-4 rounded-xl"
              style={{ backgroundColor: COLORS.surface }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: COLORS.surfaceContainer }}
              >
                <GraduationCap className="w-5 h-5" style={{ color: theme.primaryColor }} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm" style={{ color: theme.textColor }}>
                  {edu.degree}
                </h3>
                <p className="text-sm mt-0.5" style={{ color: `${theme.textColor}70` }}>
                  {edu.school}
                </p>
                {edu.year && (
                  <p className="text-xs mt-1" style={{ color: `${theme.textColor}50` }}>
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
    <section className="px-6 py-8" style={{ backgroundColor: COLORS.surface }}>
      <div className="max-w-md mx-auto">
        <h2
          className="text-xl font-extrabold mb-5"
          style={{
            fontFamily: "'Manrope', sans-serif",
            color: theme.textColor,
            letterSpacing: "-0.02em",
          }}
        >
          Tech Stack
        </h2>
        <div className="space-y-5">
          {techStack.map((stack, i) => (
            <div key={i}>
              <h3
                className="text-xs uppercase tracking-widest mb-3 font-semibold"
                style={{ color: `${theme.textColor}60` }}
              >
                {stack.category}
              </h3>
              <div className="flex flex-wrap gap-2">
                {stack.skills.map((skill, j) => (
                  <span
                    key={j}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: COLORS.surfaceContainerHigh,
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
    <section className="px-6 py-8" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="max-w-md mx-auto">
        <h2
          className="text-xl font-extrabold mb-5"
          style={{
            fontFamily: "'Manrope', sans-serif",
            color: theme.textColor,
            letterSpacing: "-0.02em",
          }}
        >
          Services
        </h2>
        <div className="flex flex-wrap gap-2">
          {services.map((service, i) => (
            <span
              key={i}
              className="px-4 py-2 rounded-full text-sm font-medium"
              style={{
                backgroundColor: COLORS.primaryFixed,
                color: theme.primaryColor,
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
    <section className="px-6 py-8" style={{ backgroundColor: COLORS.surface }}>
      <div className="max-w-md mx-auto">
        <h2
          className="text-xl font-extrabold mb-5"
          style={{
            fontFamily: "'Manrope', sans-serif",
            color: theme.textColor,
            letterSpacing: "-0.02em",
          }}
        >
          Experience
        </h2>
        <div className="space-y-4">
          {experience.map((exp, i) => (
            <div
              key={i}
              className="p-4 rounded-xl"
              style={{ backgroundColor: COLORS.surfaceContainerHigh }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: COLORS.surface }}
                >
                  <Briefcase className="w-4 h-4" style={{ color: theme.primaryColor }} />
                </div>
                <div className="flex-1">
                  <h3
                    className="font-semibold text-sm"
                    style={{ color: theme.textColor }}
                  >
                    {exp.title}
                  </h3>
                  <p className="text-sm mt-0.5" style={{ color: `${theme.textColor}70` }}>
                    {exp.company}
                  </p>
                  <p className="text-xs mt-1" style={{ color: `${theme.textColor}50` }}>
                    {exp.period}
                  </p>
                  {exp.description && (
                    <p className="text-sm mt-3 leading-relaxed" style={{ color: `${theme.textColor}80` }}>
                      {exp.description}
                    </p>
                  )}
                </div>
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
    <section className="px-6 py-8" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-xl font-extrabold"
            style={{
              fontFamily: "'Manrope', sans-serif",
              color: theme.textColor,
              letterSpacing: "-0.02em",
            }}
          >
            Recent Work
          </h2>
        </div>
        <div className="space-y-5">
          {projects.slice(0, 3).map((project, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: COLORS.surfaceContainerHigh,
                boxShadow: "0 20px 40px rgba(25, 28, 30, 0.06)",
              }}
            >
              {project.images && project.images[0] && (
                <div className="aspect-video">
                  <img
                    src={resolveImageUrl(project.images[0])}
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-5">
                <h3
                  className="font-bold text-base mb-2"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  {project.title}
                </h3>
                {project.description && (
                  <p className="text-sm leading-relaxed mb-4" style={{ color: `${theme.textColor}70` }}>
                    {project.description}
                  </p>
                )}
                {project.externalUrl && (
                  <a
                    href={project.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm flex items-center gap-1 font-semibold"
                    style={{ color: theme.primaryColor }}
                  >
                    View Project <ChevronRight className="w-4 h-4" />
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
    <section className="px-6 py-8" style={{ backgroundColor: COLORS.surface }}>
      <div className="max-w-md mx-auto">
        <h2
          className="text-xl font-extrabold mb-5"
          style={{
            fontFamily: "'Manrope', sans-serif",
            color: theme.textColor,
            letterSpacing: "-0.02em",
          }}
        >
          Recommendations
        </h2>
        <div className="space-y-4">
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              className="rounded-xl p-5"
              style={{ backgroundColor: COLORS.surfaceContainerHigh }}
            >
              <Quote className="w-6 h-6 mb-3" style={{ color: `${theme.primaryColor}40` }} />
              <p
                className="text-sm leading-relaxed mb-4"
                style={{ color: theme.textColor }}
              >
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div>
                <p className="text-sm font-semibold" style={{ color: theme.primaryColor }}>
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
    <section className="px-6 py-8" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="max-w-md mx-auto">
        <h2
          className="text-xl font-extrabold mb-5"
          style={{
            fontFamily: "'Manrope', sans-serif",
            color: theme.textColor,
            letterSpacing: "-0.02em",
          }}
        >
          Gallery
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {gallery.slice(0, 6).map((img, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg overflow-hidden"
              style={{ backgroundColor: COLORS.surface }}
            >
              <img
                src={resolveImageUrl(img)}
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
    <section className="px-6 py-10" style={{ backgroundColor: COLORS.surface }}>
      <div className="max-w-md mx-auto">
        <h2
          className="text-xl font-extrabold mb-2"
          style={{
            fontFamily: "'Manrope', sans-serif",
            color: theme.textColor,
            letterSpacing: "-0.02em",
          }}
        >
          Get In Touch
        </h2>
        <p className="text-sm mb-6" style={{ color: `${theme.textColor}70` }}>
          I&apos;m always interested in hearing about new projects and opportunities.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="text-xs uppercase tracking-widest mb-2 block font-semibold"
              style={{ color: `${theme.textColor}60` }}
            >
              Name
            </label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
              className="h-11 rounded-xl border-0"
              style={{
                backgroundColor: COLORS.surfaceContainerHigh,
                color: theme.textColor,
              }}
            />
          </div>
          <div>
            <label
              className="text-xs uppercase tracking-widest mb-2 block font-semibold"
              style={{ color: `${theme.textColor}60` }}
            >
              Email
            </label>
            <Input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="your@email.com"
              className="h-11 rounded-xl border-0"
              style={{
                backgroundColor: COLORS.surfaceContainerHigh,
                color: theme.textColor,
              }}
            />
          </div>
          <div>
            <label
              className="text-xs uppercase tracking-widest mb-2 block font-semibold"
              style={{ color: `${theme.textColor}60` }}
            >
              Message
            </label>
            <Textarea
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Tell me about your project..."
              className="min-h-[100px] resize-none rounded-xl border-0"
              style={{
                backgroundColor: COLORS.surfaceContainerHigh,
                color: theme.textColor,
              }}
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || isSuccess}
            className="w-full h-11 font-semibold rounded-xl border-0"
            style={{
              background: isSuccess
                ? "#22c55e"
                : `linear-gradient(135deg, ${theme.primaryColor}, ${COLORS.primaryContainer})`,
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
