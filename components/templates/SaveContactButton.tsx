"use client";

import { Download } from "lucide-react";
import { downloadVCard } from "@/lib/vcard";
import { ProfileInfo } from "@/types/profile";

interface SaveContactButtonProps {
    agent: ProfileInfo;
    theme: {
        primaryColor: string;
        backgroundColor: string;
        textColor: string;
    };
    variant?: "editorial" | "kinetic" | "architectural";
}

export function SaveContactButton({ agent, theme, variant = "editorial" }: SaveContactButtonProps) {
    const handleSaveContact = () => {
        downloadVCard(agent);
    };

    // Variant-specific styles
    const getStyles = () => {
        switch (variant) {
            case "kinetic":
                return {
                    button: {
                        backgroundColor: theme.primaryColor,
                        color: "#39008c",
                        clipPath: "polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)",
                    },
                    icon: theme.textColor,
                };
            case "architectural":
                return {
                    button: {
                        background: `linear-gradient(135deg, ${theme.primaryColor}, #002d62)`,
                        color: "#ffffff",
                        borderRadius: "0.75rem",
                    },
                    icon: "#ffffff",
                };
            case "editorial":
            default:
                return {
                    button: {
                        backgroundColor: theme.primaryColor,
                        color: "#ffffff",
                        borderRadius: "9999px",
                    },
                    icon: "#ffffff",
                };
        }
    };

    const styles = getStyles();

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <button
                onClick={handleSaveContact}
                className="flex items-center gap-2 px-6 py-3 font-semibold text-sm shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
                style={styles.button}
            >
                <Download className="w-4 h-4" style={{ color: styles.icon }} />
                <span>Save Contact</span>
            </button>
        </div>
    );
}
