"use client";

import { useEffect } from "react";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InspectorPanelProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    onSave?: () => void;
}

/**
 * Docked section editor. Replaces the old `SectionEditor`, which was a
 * `fixed inset-0` fullscreen overlay that hid the live preview the instant
 * it opened — the one thing a profile builder exists to let you watch.
 *
 * Below `lg:` it renders as a bottom sheet (the preview stays visible above
 * it). At `lg:` and up it docks into its own grid column beside the sticky
 * preview column, so it never covers the preview at any width.
 */
export function InspectorPanel({ isOpen, onClose, title, children, onSave }: InspectorPanelProps) {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-label={title}
            className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[70dvh] flex-col rounded-t-[var(--r-lg)] border border-border bg-background motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-200
                lg:static lg:z-auto lg:max-h-none lg:h-full lg:rounded-[var(--r-md)] lg:border lg:motion-safe:animate-none"
            style={{ boxShadow: "var(--e-overlay)" }}
        >
            <div className="flex items-center justify-between gap-3 p-4 border-b border-border bg-background rounded-t-[var(--r-lg)] lg:rounded-t-[var(--r-md)]">
                <h2 className="font-semibold text-foreground">{title}</h2>
                <div className="flex items-center gap-1">
                    {onSave && (
                        <Button size="sm" onClick={onSave} className="bg-primary text-primary-foreground">
                            <Save className="w-4 h-4 mr-2" /> Done
                        </Button>
                    )}
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-background">
                {children}
            </div>
        </div>
    );
}
