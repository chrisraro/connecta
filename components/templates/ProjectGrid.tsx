"use client";

import { ProfileData, ProjectItem, ProjectCategory, PROJECT_CATEGORY_LABELS } from "@/types/profile";
import { useState } from "react";
import { ExternalLink, BookOpen, Tag, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * WCAG-compliant contrast helper.
 */
function getContrastColor(hexColor: string): string {
    const hex = hexColor.replace("#", "");
    if (hex.length !== 6) return "#ffffff";
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const toLinear = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return L > 0.179 ? "#000000" : "#ffffff";
}

const CATEGORY_COLORS: Record<ProjectCategory, string> = {
    "graphic-design": "bg-purple-100 text-purple-800",
    "web-design": "bg-blue-100 text-blue-800",
    "photography": "bg-amber-100 text-amber-800",
    "video": "bg-red-100 text-red-800",
    "branding": "bg-pink-100 text-pink-800",
    "case-study": "bg-teal-100 text-teal-800",
    "development": "bg-green-100 text-green-800",
    "ui-ux": "bg-indigo-100 text-indigo-800",
    "real-estate": "bg-orange-100 text-orange-800",
    "other": "bg-gray-100 text-gray-700",
};

export default function ProjectGrid({ data }: { data: ProfileData }) {
    const { projects, theme } = data;
    const [activeCategory, setActiveCategory] = useState<ProjectCategory | "all">("all");

    if (!projects || projects.length === 0) return null;

    const categories = Array.from(new Set(projects.map(p => p.category))) as ProjectCategory[];
    const filtered = activeCategory === "all"
        ? projects
        : projects.filter(p => p.category === activeCategory);

    const primaryColor = theme.primaryColor;
    const contrastColor = getContrastColor(primaryColor);

    return (
        <div className="w-full max-w-md mx-auto pb-20">
            {/* Section Header */}
            <div className="px-4 pt-6 pb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Layers className="w-5 h-5" style={{ color: primaryColor }} />
                    Projects
                </h2>
            </div>

            {/* Category Filter Tabs */}
            {categories.length > 1 && (
                <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
                    <button
                        onClick={() => setActiveCategory("all")}
                        className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${activeCategory === "all" ? "border-transparent" : "border-border bg-muted text-muted-foreground"}`}
                        style={activeCategory === "all" ? { backgroundColor: primaryColor, color: contrastColor, borderColor: primaryColor } : {}}
                    >
                        All
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${activeCategory === cat ? "border-transparent" : "border-border bg-muted text-muted-foreground"}`}
                            style={activeCategory === cat ? { backgroundColor: primaryColor, color: contrastColor, borderColor: primaryColor } : {}}
                        >
                            {PROJECT_CATEGORY_LABELS[cat]}
                        </button>
                    ))}
                </div>
            )}

            {/* Project Cards */}
            <div className="space-y-4 px-4">
                {filtered.map(project => (
                    <ProjectCard key={project.id} project={project} primaryColor={primaryColor} contrastColor={contrastColor} />
                ))}
            </div>
        </div>
    );
}

function ProjectCard({ project, primaryColor, contrastColor }: { project: ProjectItem, primaryColor: string, contrastColor: string }) {
    const [imgIdx, setImgIdx] = useState(0);
    const images = project.images?.length > 0 ? project.images : null;

    return (
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm ring-1 ring-border/50">
            {/* Image */}
            {images && (
                <div className="relative aspect-video bg-muted overflow-hidden">
                    <img
                        src={images[imgIdx]}
                        alt={project.title}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    {/* Image dots */}
                    {images.length > 1 && (
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                            {images.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setImgIdx(i)}
                                    className={`h-1.5 rounded-full transition-all ${i === imgIdx ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* No image placeholder */}
            {!images && (
                <div className="aspect-video bg-muted/40 flex items-center justify-center">
                    <Layers className="w-10 h-10 text-muted-foreground/30" />
                </div>
            )}

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Category + Title */}
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[project.category]}`}>
                            {PROJECT_CATEGORY_LABELS[project.category]}
                        </span>
                        <h3 className="font-bold text-base mt-1.5 leading-tight">{project.title}</h3>
                    </div>
                </div>

                {/* Description */}
                {project.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {project.description}
                    </p>
                )}

                {/* Tags */}
                {project.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {project.tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                                <Tag className="w-2.5 h-2.5" /> {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Action Buttons */}
                {(project.externalUrl || project.caseStudyUrl) && (
                    <div className="flex gap-2 pt-1">
                        {project.externalUrl && (
                            <Button
                                size="sm"
                                className="flex-1 font-semibold"
                                style={{ backgroundColor: primaryColor, color: contrastColor }}
                                onClick={() => window.open(project.externalUrl, "_blank")}
                            >
                                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View Project
                            </Button>
                        )}
                        {project.caseStudyUrl && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => window.open(project.caseStudyUrl, "_blank")}
                            >
                                <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Case Study
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
