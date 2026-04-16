"use client";

import { ProfileData, ProjectItem } from "@/types/profile";
import { ExternalLink, Info, X, Layout, Tag, ChevronRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { resolveImageUrl } from "@/lib/utils";

export default function ProjectGrid({ data }: { data: ProfileData }) {
    const { projects, theme } = data;

    if (!projects || projects.length === 0) return null;

    return (
        <div className="w-full max-w-md mx-auto space-y-6 pb-20 px-4">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-black uppercase tracking-tight" style={{ color: theme.textColor }}>
                    Portfolio
                </h2>
                <div className="h-px flex-1 bg-border/50 ml-4" />
            </div>
            
            <div className="grid grid-cols-1 gap-6">
                {projects.map((project) => (
                    <ProjectCard key={project.id} project={project} theme={theme} />
                ))}
            </div>
        </div>
    );
}

interface ProjectCardProps {
    project: ProjectItem;
    theme: ProfileData["theme"];
}

function ProjectCard({ project, theme }: ProjectCardProps) {
    const mainImage = project.images && project.images.length > 0 ? project.images[0] : "/placeholder-project.jpg";

    return (
        <div className="group bg-card rounded-[2rem] overflow-hidden border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500 flex flex-col">
            {/* Image Area */}
            <div className="relative aspect-video overflow-hidden bg-muted">
                <img
                    src={resolveImageUrl(mainImage)}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute top-4 left-4">
                    <Badge className="bg-background/80 backdrop-blur-md text-foreground border-none px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                        {project.category.replace("-", " ")}
                    </Badge>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-6 flex flex-col gap-4">
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tight mb-1">{project.title}</h3>
                    <div className="flex flex-wrap gap-1.5">
                        {project.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[10px] font-bold uppercase tracking-tighter opacity-50">#{tag}</span>
                        ))}
                    </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed font-medium">
                    {project.description}
                </p>

                <div className="flex gap-2 pt-2 mt-auto">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="flex-1 rounded-2xl h-12 font-bold uppercase tracking-widest text-[10px] border-border hover:bg-muted">
                                <Info className="w-4 h-4 mr-2" /> Details
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[85vh] rounded-t-[3rem] p-0 overflow-hidden flex flex-col border-none">
                            <SheetHeader className="sr-only">
                                <SheetTitle>{project.title}</SheetTitle>
                                <SheetDescription>Project details and gallery</SheetDescription>
                            </SheetHeader>
                            
                            {/* Scrollable Project Detail */}
                            <div className="flex-1 overflow-y-auto">
                                <div className="aspect-video relative">
                                    <img src={resolveImageUrl(mainImage)} alt={project.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                                    <div className="absolute bottom-8 left-8 right-8">
                                        <Badge className="mb-4 bg-primary text-primary-foreground border-none px-4 py-1 uppercase tracking-widest font-black text-xs">
                                            {project.category}
                                        </Badge>
                                        <h2 className="text-4xl font-black uppercase tracking-tighter text-foreground leading-none">{project.title}</h2>
                                    </div>
                                </div>

                                <div className="p-8 space-y-8 pb-32">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Overview</h3>
                                        <p className="text-muted-foreground leading-relaxed text-lg font-medium whitespace-pre-line">
                                            {project.description}
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Technologies</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {project.tags.map(tag => (
                                                <Badge key={tag} variant="secondary" className="bg-muted text-foreground border-none px-4 py-1.5 rounded-xl font-bold">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Project Gallery */}
                                    {project.images && project.images.length > 1 && (
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Gallery</h3>
                                            <div className="grid grid-cols-1 gap-4">
                                                {project.images.slice(1).map((img, i) => (
                                                    <div key={i} className="rounded-3xl overflow-hidden border border-border bg-muted">
                                                        <img src={resolveImageUrl(img)} alt={`${project.title} ${i}`} className="w-full h-auto" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sticky Link Button */}
                            {project.externalUrl && (
                                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent pt-12">
                                    <Button 
                                        asChild 
                                        className="w-full h-16 rounded-[2rem] bg-primary text-primary-foreground font-black uppercase tracking-widest shadow-2xl shadow-primary/20"
                                    >
                                        <a href={project.externalUrl} target="_blank" rel="noopener noreferrer">
                                            Visit Live Project <ExternalLink className="ml-2 w-5 h-5" />
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </SheetContent>
                    </Sheet>

                    {project.externalUrl && (
                        <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-12 w-12 rounded-2xl bg-muted text-foreground hover:bg-muted/80"
                            asChild
                        >
                            <a href={project.externalUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
