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

const SOCIAL_ICONS: Record<string, React.ElementType> = {
    "Instagram": Instagram,
    "Facebook": Facebook,
    "LinkedIn": Linkedin,
    "Twitter": Twitter,
    "TikTok": LinkIcon,
    "YouTube": Youtube,
    "Website": Globe
};

export default function Default({ data }: TemplateProps) {
    const { agent, theme, projects, ownerId } = data;

    return (
        <div 
            className="min-h-screen pb-20"
            style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}
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
        <section className="px-6 pt-8 pb-6">
            <div className="max-w-md mx-auto">
                {/* Profile Image */}
                <div className="flex justify-center mb-6">
                    <div 
                        className="w-28 h-28 rounded-full overflow-hidden border-4 shadow-lg"
                        style={{ borderColor: theme.primaryColor }}
                    >
                        <img
                            src={resolveImageUrl(agent.avatarUrl) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${agent.fullName}`}
                            alt={agent.fullName}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

                {/* Name & Title */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold mb-1">{agent.fullName}</h1>
                    <p className="text-sm opacity-70">{agent.title}</p>
                    {agent.company && <p className="text-sm opacity-50">{agent.company}</p>}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-center flex-wrap">
                    {agent.phone && (
                        <a 
                            href={`tel:${agent.phone}`}
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white"
                            style={{ backgroundColor: theme.primaryColor }}
                        >
                            <Phone className="w-4 h-4" />
                            Call Me
                        </a>
                    )}
                    {agent.email && (
                        <a 
                            href={`mailto:${agent.email}`}
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border"
                            style={{ borderColor: theme.textColor, color: theme.textColor }}
                        >
                            <Mail className="w-4 h-4" />
                            Email
                        </a>
                    )}
                    {agent.socialLinks?.find(l => l.platform === "Website") && (
                        <a 
                            href={agent.socialLinks.find(l => l.platform === "Website")?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border"
                            style={{ borderColor: theme.textColor, color: theme.textColor }}
                        >
                            <Globe className="w-4 h-4" />
                            Projects
                        </a>
                    )}
                </div>

                {/* Social Links */}
                {agent.socialLinks && agent.socialLinks.length > 0 && (
                    <div className="flex justify-center gap-4 mt-6">
                        {agent.socialLinks.filter(l => l.platform !== "Website").map((link, i) => {
                            const Icon = SOCIAL_ICONS[link.platform] || LinkIcon;
                            return (
                                <a
                                    key={i}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                                    style={{ backgroundColor: `${theme.textColor}20` }}
                                >
                                    <Icon className="w-5 h-5" style={{ color: theme.textColor }} />
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
        <section className="px-6 py-6">
            <div className="max-w-md mx-auto">
                <h2 className="text-lg font-bold mb-3">About</h2>
                <p className="text-sm leading-relaxed opacity-80">{agent.about}</p>
            </div>
        </section>
    );
}

// ─── Certification Section ───────────────────────────────────────────────────

function CertificationSection({ certification, theme }: { certification: NonNullable<TemplateProps["data"]["agent"]["certification"]>; theme: TemplateProps["data"]["theme"] }) {
    return (
        <section className="px-6 py-4">
            <div className="max-w-md mx-auto">
                <div 
                    className="rounded-2xl p-5 text-white"
                    style={{ backgroundColor: theme.primaryColor }}
                >
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm mb-1">{certification.title}</h3>
                            <p className="text-xs opacity-90 leading-relaxed">{certification.description}</p>
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
        <section className="px-6 py-6">
            <div className="max-w-md mx-auto">
                <h2 className="text-lg font-bold mb-4">Education</h2>
                <div className="space-y-4">
                    {education.map((edu, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${theme.primaryColor}20` }}
                            >
                                <GraduationCap className="w-5 h-5" style={{ color: theme.primaryColor }} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">{edu.degree}</h3>
                                <p className="text-xs opacity-70">{edu.school}</p>
                                {edu.year && <p className="text-xs opacity-50">{edu.year}</p>}
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
        <section className="px-6 py-6">
            <div className="max-w-md mx-auto">
                <h2 className="text-lg font-bold mb-4">Tech Stack</h2>
                <div className="space-y-4">
                    {techStack.map((stack, i) => (
                        <div key={i}>
                            <h3 className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-2">{stack.category}</h3>
                            <div className="flex flex-wrap gap-2">
                                {stack.skills.map((skill, j) => (
                                    <span 
                                        key={j}
                                        className="px-3 py-1 rounded-full text-xs font-medium"
                                        style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}
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
        <section className="px-6 py-6">
            <div className="max-w-md mx-auto">
                <h2 className="text-lg font-bold mb-4">Services</h2>
                <div className="flex flex-wrap gap-2">
                    {services.map((service, i) => (
                        <span 
                            key={i}
                            className="px-4 py-2 rounded-full text-sm font-medium"
                            style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}
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
        <section className="px-6 py-6">
            <div className="max-w-md mx-auto">
                <h2 className="text-lg font-bold mb-4">Experience</h2>
                <div className="space-y-5 relative">
                    {/* Timeline line */}
                    <div 
                        className="absolute left-4 top-2 bottom-2 w-px"
                        style={{ backgroundColor: `${theme.textColor}20` }}
                    />
                    {experience.map((exp, i) => (
                        <div key={i} className="flex gap-4 relative">
                            <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10"
                                style={{ backgroundColor: theme.primaryColor }}
                            >
                                <Briefcase className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 pt-1">
                                <h3 className="font-semibold text-sm">{exp.title}</h3>
                                <p className="text-xs opacity-70">{exp.company}</p>
                                <p className="text-xs opacity-50 mt-0.5">{exp.period}</p>
                                {exp.description && (
                                    <p className="text-xs opacity-60 mt-2 leading-relaxed">{exp.description}</p>
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
        <section className="px-6 py-6">
            <div className="max-w-md mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">Recent Projects</h2>
                    <button className="text-xs flex items-center gap-1 opacity-60 hover:opacity-100" style={{ color: theme.primaryColor }}>
                        View All <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
                <div className="space-y-4">
                    {projects.slice(0, 3).map((project, i) => (
                        <div 
                            key={i}
                            className="rounded-xl overflow-hidden border"
                            style={{ borderColor: `${theme.textColor}15` }}
                        >
                            {project.images && project.images[0] && (
                                <div className="aspect-video bg-muted">
                                    <img 
                                        src={resolveImageUrl(project.images[0])} 
                                        alt={project.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <div className="p-4">
                                <h3 className="font-semibold text-sm mb-1">{project.title}</h3>
                                {project.description && (
                                    <p className="text-xs opacity-60 line-clamp-2 mb-3">{project.description}</p>
                                )}
                                {project.externalUrl && (
                                    <a 
                                        href={project.externalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs flex items-center gap-1 font-medium"
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
        <section className="px-6 py-6">
            <div className="max-w-md mx-auto">
                <h2 className="text-lg font-bold mb-4">Recommendations</h2>
                <div className="space-y-4">
                    {testimonials.map((testimonial, i) => (
                        <div 
                            key={i}
                            className="rounded-xl p-4"
                            style={{ backgroundColor: `${theme.textColor}08` }}
                        >
                            <Quote className="w-6 h-6 mb-2 opacity-30" style={{ color: theme.primaryColor }} />
                            <p className="text-sm italic opacity-80 mb-3 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
                            <div>
                                <p className="text-xs font-semibold">{testimonial.author}</p>
                                {testimonial.role && <p className="text-xs opacity-60">{testimonial.role}</p>}
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
        <section className="px-6 py-6">
            <div className="max-w-md mx-auto">
                <h2 className="text-lg font-bold mb-4">Gallery</h2>
                <div className="grid grid-cols-3 gap-2">
                    {gallery.slice(0, 6).map((img, i) => (
                        <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted">
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
        <section className="px-6 py-8">
            <div className="max-w-md mx-auto">
                <h2 className="text-lg font-bold mb-1">Get In Touch</h2>
                <p className="text-sm opacity-60 mb-6">I&apos;m always interested in hearing about new projects and opportunities.</p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-medium opacity-70 mb-1.5 block">Name</label>
                        <Input
                            required
                            value={form.name}
                            onChange={(e) => setForm({...form, name: e.target.value})}
                            placeholder="Your name"
                            className="h-11"
                            style={{ backgroundColor: `${theme.textColor}08`, borderColor: `${theme.textColor}15` }}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium opacity-70 mb-1.5 block">Email</label>
                        <Input
                            required
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({...form, email: e.target.value})}
                            placeholder="your@email.com"
                            className="h-11"
                            style={{ backgroundColor: `${theme.textColor}08`, borderColor: `${theme.textColor}15` }}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium opacity-70 mb-1.5 block">Message</label>
                        <Textarea
                            required
                            value={form.message}
                            onChange={(e) => setForm({...form, message: e.target.value})}
                            placeholder="Tell me about your project..."
                            className="min-h-[100px] resize-none"
                            style={{ backgroundColor: `${theme.textColor}08`, borderColor: `${theme.textColor}15` }}
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={isSubmitting || isSuccess}
                        className="w-full h-11 font-semibold rounded-xl"
                        style={{ 
                            backgroundColor: isSuccess ? "#22c55e" : theme.primaryColor, 
                            color: "#fff"
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
