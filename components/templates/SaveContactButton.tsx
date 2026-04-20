"use client";

import { Download, Wifi, WifiOff } from "lucide-react";
import { downloadVCard } from "@/lib/vcard";
import { ProfileInfo } from "@/types/profile";
import { useState, useEffect } from "react";
import { isOnline } from "@/lib/offline-leads";

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
    const [online, setOnline] = useState(true);

    useEffect(() => {
        setOnline(isOnline());
        
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
            {!online && (
                <div className="bg-black/80 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                    <WifiOff className="w-3 h-3" />
                    <span>Offline Mode - vCard Download</span>
                </div>
            )}
            <button
                onClick={handleSaveContact}
                className="flex items-center gap-2 px-6 py-3 font-semibold text-sm shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
                style={styles.button}
            >
                <Download className="w-4 h-4" style={{ color: styles.icon }} />
                <span>{online ? "Save Contact" : "Download vCard"}</span>
                {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            </button>
        </div>
    );
}
