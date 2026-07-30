"use client";

import { Download } from "lucide-react";
import { downloadVCard } from "@/lib/vcard";
import { ProfileInfo } from "@/types/profile";
import { TemplateTheme } from "./theme";
import { readableTextColor } from "@/lib/utils";

interface SaveContactButtonProps {
    agent: ProfileInfo;
    theme: TemplateTheme;
}

/** Radius per template identity — same token system as everywhere else,
 *  no more bespoke clip-path polygons. */
function radiusFor(theme: TemplateTheme): string {
    switch (theme.composition.rule) {
        case "numbered":
            return "var(--r-sm)"; // Kinetic: sharp
        case "none":
            return "var(--r-md)"; // Architectural: structured
        case "hairline":
        default:
            return "9999px"; // Editorial: pill
    }
}

export function SaveContactButton({ agent, theme }: SaveContactButtonProps) {
    const handleSaveContact = () => {
        downloadVCard(agent);
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <button
                onClick={handleSaveContact}
                className="flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-transform motion-safe:hover:scale-105 motion-safe:active:scale-95"
                style={{
                    backgroundColor: theme.colors.accent,
                    color: readableTextColor(theme.colors.accent),
                    borderRadius: radiusFor(theme),
                    boxShadow: "var(--e-overlay)",
                }}
            >
                <Download className="w-4 h-4" />
                <span>Save Contact</span>
            </button>
        </div>
    );
}
