"use client";

import { useEffect, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Phone, Mail, Briefcase, Sparkles, GripHorizontal } from "lucide-react";
import { DigitalCardConfig } from "@/types/profile";

interface DigitalBusinessCardProps {
    fullName: string;
    title: string;
    company?: string;
    phone: string;
    email: string;
    additionalPhones?: string[];
    additionalEmails?: string[];
    services?: string[];
    about?: string;
    profileId?: string;
    config?: Partial<DigitalCardConfig>;
    onPositionsChange?: (positions: any) => void;
}

const DEFAULT_POSITIONS = {
    header: { x: 5, y: 8, width: 62, scale: 1.0 },
    qr: { x: 72, y: 8, width: 23, scale: 1.0 },
    bio: { x: 5, y: 44, width: 90, scale: 1.0 },
    contacts: { x: 5, y: 65, width: 90, scale: 1.0 },
};

export function DigitalBusinessCard({
    fullName,
    title,
    company,
    phone,
    email,
    additionalPhones = [],
    additionalEmails = [],
    services = [],
    about,
    profileId,
    config,
    onPositionsChange,
}: DigitalBusinessCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [qrUrl, setQrUrl] = useState("");

    // Detect browser/window environment to build the URL
    useEffect(() => {
        if (typeof window !== "undefined") {
            const host = window.location.origin;
            const targetUrl = profileId ? `${host}/p/${profileId}` : `${host}`;
            setQrUrl(targetUrl);
        }
    }, [profileId]);

    // Defaults
    const activeTheme = config?.theme || "dark";
    const bgType = config?.cardBackgroundType || "solid";
    const showQrCode = config?.showQrCode !== false;
    const activePositions = config?.positions || DEFAULT_POSITIONS;

    // Helper to resolve color value safely
    const resolveColor = (colorStr: string | undefined, defaultColor: string): string => {
        if (!colorStr) return defaultColor;
        const clean = colorStr.trim().toLowerCase();
        
        let formatted = clean;
        if (formatted.startsWith("##")) {
            formatted = formatted.substring(1);
        }
        
        if (formatted.startsWith("#")) {
            const nameWithoutHash = formatted.substring(1);
            const cssNamedColors = ["black", "white", "red", "green", "blue", "yellow", "gray", "grey", "silver", "gold", "orange", "purple", "pink", "brown"];
            if (cssNamedColors.includes(nameWithoutHash)) {
                return nameWithoutHash;
            }
            const hexBody = nameWithoutHash;
            if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/.test(hexBody)) {
                return defaultColor;
            }
        }
        return formatted;
    };

    const hexToRgba = (hex: string, alpha: number) => {
        let cleanHex = hex.trim().replace(/^#/, '');
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(char => char + char).join('');
        }
        if (cleanHex.length !== 6) {
            return `rgba(255, 255, 255, ${alpha})`;
        }
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Calculate resolved background and text colors dynamically
    const defaultBg = activeTheme === "light" ? "#f8fafc" : (activeTheme === "glass" ? "rgba(255, 255, 255, 0.12)" : "#121214");
    const defaultText = activeTheme === "light" ? "#1e293b" : "#f5f5f5";

    const resolvedBgColor = resolveColor(config?.backgroundColor, defaultBg);
    const resolvedTextColor = resolveColor(config?.textColor, defaultText);

    // Theme Styles
    let themeClasses = "";
    let inlineStyles: React.CSSProperties = {
        color: resolvedTextColor,
    };

    if (activeTheme === "light") {
        themeClasses = "border border-slate-200/80 shadow-md";
        if (bgType === "solid") {
            inlineStyles.backgroundColor = resolvedBgColor;
        } else if (bgType === "gradient" && config?.cardGradientStart && config?.cardGradientEnd) {
            const start = resolveColor(config.cardGradientStart, "#f8fafc");
            const end = resolveColor(config.cardGradientEnd, "#e2e8f0");
            inlineStyles.background = `linear-gradient(135deg, ${start}, ${end})`;
        } else {
            inlineStyles.backgroundColor = "#f8fafc";
        }
    } else if (activeTheme === "dark") {
        themeClasses = "border border-neutral-800 shadow-xl";
        if (bgType === "solid") {
            inlineStyles.backgroundColor = resolvedBgColor;
        } else if (bgType === "gradient" && config?.cardGradientStart && config?.cardGradientEnd) {
            const start = resolveColor(config.cardGradientStart, "#18181b");
            const end = resolveColor(config.cardGradientEnd, "#09090b");
            inlineStyles.background = `linear-gradient(135deg, ${start}, ${end})`;
        } else {
            inlineStyles.background = "linear-gradient(135deg, #18181b 0%, #09090b 100%)";
        }
    } else if (activeTheme === "glass") {
        themeClasses = "backdrop-blur-xl border border-white/20 shadow-2xl";
        if (bgType === "solid") {
            const baseColor = config?.backgroundColor ? resolveColor(config.backgroundColor, "#ffffff") : "#ffffff";
            inlineStyles.backgroundColor = hexToRgba(baseColor, 0.15);
        } else if (bgType === "gradient" && config?.cardGradientStart && config?.cardGradientEnd) {
            const start = resolveColor(config.cardGradientStart, "#ffffff");
            const end = resolveColor(config.cardGradientEnd, "#ffffff");
            inlineStyles.background = `linear-gradient(135deg, ${hexToRgba(start, 0.15)}, ${hexToRgba(end, 0.15)})`;
        } else {
            inlineStyles.backgroundColor = "rgba(255, 255, 255, 0.12)";
        }
    } else if (activeTheme === "carbon") {
        themeClasses = "border border-zinc-800 shadow-2xl relative overflow-hidden";
        const carbonPattern = `
            radial-gradient(circle at 100% 150%, rgba(34,34,34,0.85) 24%, rgba(0,0,0,0.9) 24%, rgba(0,0,0,0.9) 28%, rgba(34,34,34,0.85) 28%, rgba(34,34,34,0.85) 36%, rgba(0,0,0,0.9) 36%, rgba(0,0,0,0.9) 40%, transparent 40%, transparent),
            radial-gradient(circle at 0% 150%, rgba(34,34,34,0.85) 24%, rgba(0,0,0,0.9) 24%, rgba(0,0,0,0.9) 28%, rgba(34,34,34,0.85) 28%, rgba(34,34,34,0.85) 36%, rgba(0,0,0,0.9) 36%, rgba(0,0,0,0.9) 40%, transparent 40%, transparent),
            radial-gradient(circle at 50% 100%, rgba(17,17,17,0.8) 10%, rgba(0,0,0,0.9) 10%, rgba(0,0,0,0.9) 23%, rgba(17,17,17,0.8) 23%, rgba(17,17,17,0.8) 30%, rgba(0,0,0,0.9) 30%, rgba(0,0,0,0.9) 43%, transparent 43%, transparent)
        `;
        if (bgType === "solid") {
            const baseColor = config?.backgroundColor ? resolveColor(config.backgroundColor, "#0d0d0d") : "#0d0d0d";
            inlineStyles.backgroundColor = baseColor;
            inlineStyles.backgroundImage = carbonPattern;
            inlineStyles.backgroundSize = "20px 20px";
        } else if (bgType === "gradient" && config?.cardGradientStart && config?.cardGradientEnd) {
            const start = resolveColor(config.cardGradientStart, "#18181b");
            const end = resolveColor(config.cardGradientEnd, "#020202");
            inlineStyles.backgroundImage = `${carbonPattern}, linear-gradient(135deg, ${start}, ${end})`;
            inlineStyles.backgroundSize = "20px 20px, 20px 20px, 20px 20px, 100% 100%";
        } else {
            inlineStyles.backgroundColor = "#0d0d0d";
            inlineStyles.backgroundImage = carbonPattern;
            inlineStyles.backgroundSize = "20px 20px";
        }
    }

    // Contact lists
    const allPhones = [phone, ...additionalPhones].filter(Boolean);
    const allEmails = [email, ...additionalEmails].filter(Boolean);

    // Interactive element positions
    const getPos = (key: "header" | "qr" | "bio" | "contacts") => {
        return activePositions[key] || DEFAULT_POSITIONS[key];
    };

    // Drag event handlers
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, elementKey: "header" | "qr" | "bio" | "contacts") => {
        if (!onPositionsChange) return;
        e.preventDefault();

        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

        const cardElement = cardRef.current;
        if (!cardElement) return;

        const rect = cardElement.getBoundingClientRect();
        const startX = clientX;
        const startY = clientY;

        const initialPos = getPos(elementKey);

        const handleDrag = (moveEvent: MouseEvent | TouchEvent) => {
            const currentX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const currentY = "touches" in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

            const deltaX = ((currentX - startX) / rect.width) * 100;
            const deltaY = ((currentY - startY) / rect.height) * 100;

            const newX = Math.max(0, Math.min(100 - (initialPos.width || 20), Math.round(initialPos.x + deltaX)));
            const newY = Math.max(0, Math.min(92, Math.round(initialPos.y + deltaY)));

            const newPositions = {
                ...activePositions,
                [elementKey]: {
                    ...initialPos,
                    x: newX,
                    y: newY,
                },
            };
            onPositionsChange(newPositions);
        };

        const handleDragEnd = () => {
            window.removeEventListener("mousemove", handleDrag);
            window.removeEventListener("mouseup", handleDragEnd);
            window.removeEventListener("touchmove", handleDrag);
            window.removeEventListener("touchend", handleDragEnd);
        };

        window.addEventListener("mousemove", handleDrag);
        window.addEventListener("mouseup", handleDragEnd);
        window.addEventListener("touchmove", handleDrag);
        window.addEventListener("touchend", handleDragEnd);
    };

    // Resize event handlers (supports full size resizing of width and vertical scale)
    const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, elementKey: "header" | "qr" | "bio" | "contacts") => {
        if (!onPositionsChange) return;
        e.preventDefault();
        e.stopPropagation();

        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
        const cardElement = cardRef.current;
        if (!cardElement) return;

        const rect = cardElement.getBoundingClientRect();
        const startX = clientX;
        const startY = clientY;

        const initialPos = getPos(elementKey);
        const initialWidth = initialPos.width || 30;
        const initialScale = initialPos.scale || 1.0;

        const handleResize = (moveEvent: MouseEvent | TouchEvent) => {
            const currentX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const currentY = "touches" in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

            // Horizontal resize modifies width
            const deltaX = ((currentX - startX) / rect.width) * 100;
            const newWidth = Math.max(10, Math.min(100 - initialPos.x, Math.round(initialWidth + deltaX)));

            // Vertical/Diagonal drag modifies size scale (diagonally down grows it, diagonally up shrinks it)
            const deltaY = ((currentY - startY) / rect.height) * 100;
            const scaleChange = deltaY / 40; // 40% height change translates to a 1.0 scale factor adjustment
            const newScale = Math.max(0.4, Math.min(2.5, Math.round((initialScale + scaleChange) * 100) / 100));

            const newPositions = {
                ...activePositions,
                [elementKey]: {
                    ...initialPos,
                    width: newWidth,
                    scale: newScale,
                },
            };
            onPositionsChange(newPositions);
        };

        const handleResizeEnd = () => {
            window.removeEventListener("mousemove", handleResize);
            window.removeEventListener("mouseup", handleResizeEnd);
            window.removeEventListener("touchmove", handleResize);
            window.removeEventListener("touchend", handleResizeEnd);
        };

        window.addEventListener("mousemove", handleResize);
        window.addEventListener("mouseup", handleResizeEnd);
        window.addEventListener("touchmove", handleResize);
        window.addEventListener("touchend", handleResizeEnd);
    };

    const isEditable = !!onPositionsChange;

    return (
        <div
            ref={cardRef}
            style={inlineStyles}
            className={`w-full aspect-[1.65] max-w-[420px] rounded-3xl p-5 relative overflow-hidden transition-all duration-300 select-none ${themeClasses}`}
        >
            {/* Glass theme overlays */}
            {activeTheme === "glass" && (
                <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            )}

            {/* Drag instruction overlay only when in builder mode */}
            {isEditable && (
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded-full px-2 py-0.5 text-[8px] text-white flex items-center gap-1 z-10 pointer-events-none opacity-50">
                    <GripHorizontal className="w-2.5 h-2.5" /> Drag & Resize active
                </div>
            )}

            {/* Element A: Header (Company, Name, Title) */}
            <div
                style={{
                    left: `${getPos("header").x}%`,
                    top: `${getPos("header").y}%`,
                    width: `${getPos("header").width}%`,
                    transform: `scale(${getPos("header").scale || 1.0})`,
                    transformOrigin: "top left",
                }}
                className={`absolute group leading-normal ${
                    isEditable
                        ? "cursor-grab active:cursor-grabbing border border-dashed border-transparent hover:border-primary/40 hover:bg-primary/5 rounded p-1"
                        : ""
                }`}
                onMouseDown={(e) => handleDragStart(e, "header")}
                onTouchStart={(e) => handleDragStart(e, "header")}
            >
                <span
                    style={{ color: resolvedTextColor }}
                    className="text-[9px] uppercase font-bold tracking-widest opacity-70 flex items-center gap-1"
                >
                    <Sparkles className="w-2.5 h-2.5 shrink-0" />
                    {company || "Digital Card"}
                </span>
                <h3 className="text-base font-bold tracking-tight font-serif text-current mt-0.5 truncate">
                    {fullName || "Your Name"}
                </h3>
                <p className="text-[11px] opacity-90 font-medium truncate mt-0.5">
                    {title || "Your Title"}
                </p>

                {isEditable && (
                    <div
                        onMouseDown={(e) => handleResizeStart(e, "header")}
                        onTouchStart={(e) => handleResizeStart(e, "header")}
                        className="absolute right-0 bottom-0 w-3 h-3 bg-primary/75 rounded-tl cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                )}
            </div>

            {/* Element B: QR Code Block */}
            {showQrCode && qrUrl && (
                <div
                    style={{
                        left: `${getPos("qr").x}%`,
                        top: `${getPos("qr").y}%`,
                        width: `${getPos("qr").width}%`,
                        transform: `scale(${getPos("qr").scale || 1.0})`,
                        transformOrigin: "top left",
                    }}
                    className={`absolute group flex flex-col items-center justify-center ${
                        isEditable
                            ? "cursor-grab active:cursor-grabbing border border-dashed border-transparent hover:border-primary/40 hover:bg-primary/5 rounded p-1"
                            : ""
                    }`}
                    onMouseDown={(e) => handleDragStart(e, "qr")}
                    onTouchStart={(e) => handleDragStart(e, "qr")}
                >
                    <div className="p-1 rounded-lg border border-current/10 bg-current/5 backdrop-blur-sm shrink-0">
                        <QRCodeSVG
                            value={qrUrl}
                            size={55}
                            level="H"
                            includeMargin={false}
                            bgColor="transparent"
                            fgColor="currentColor"
                        />
                    </div>
                    <span className="text-[7px] opacity-60 font-semibold tracking-wider uppercase mt-1 text-center shrink-0">
                        Powered by TapFolio
                    </span>

                    {isEditable && (
                        <div
                            onMouseDown={(e) => handleResizeStart(e, "qr")}
                            onTouchStart={(e) => handleResizeStart(e, "qr")}
                            className="absolute right-0 bottom-0 w-3 h-3 bg-primary/75 rounded-tl cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                    )}
                </div>
            )}

            {/* Element C: Bio (Tagline/About) */}
            {about && (
                <div
                    style={{
                        left: `${getPos("bio").x}%`,
                        top: `${getPos("bio").y}%`,
                        width: `${getPos("bio").width}%`,
                        transform: `scale(${getPos("bio").scale || 1.0})`,
                        transformOrigin: "top left",
                    }}
                    className={`absolute group ${
                        isEditable
                            ? "cursor-grab active:cursor-grabbing border border-dashed border-transparent hover:border-primary/40 hover:bg-primary/5 rounded p-1"
                            : ""
                    }`}
                    onMouseDown={(e) => handleDragStart(e, "bio")}
                    onTouchStart={(e) => handleDragStart(e, "bio")}
                >
                    <p className="text-[9.5px] opacity-75 leading-relaxed line-clamp-2 italic font-medium">
                        &ldquo;{about}&rdquo;
                    </p>

                    {isEditable && (
                        <div
                            onMouseDown={(e) => handleResizeStart(e, "bio")}
                            onTouchStart={(e) => handleResizeStart(e, "bio")}
                            className="absolute right-0 bottom-0 w-3 h-3 bg-primary/75 rounded-tl cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                    )}
                </div>
            )}

            {/* Element D: Contacts & Services Block */}
            <div
                style={{
                    left: `${getPos("contacts").x}%`,
                    top: `${getPos("contacts").y}%`,
                    width: `${getPos("contacts").width}%`,
                    transform: `scale(${getPos("contacts").scale || 1.0})`,
                    transformOrigin: "top left",
                }}
                className={`absolute group border-t border-current/10 pt-1.5 ${
                    isEditable
                        ? "cursor-grab active:cursor-grabbing border border-dashed border-transparent hover:border-primary/40 hover:bg-primary/5 rounded p-1"
                        : ""
                }`}
                onMouseDown={(e) => handleDragStart(e, "contacts")}
                onTouchStart={(e) => handleDragStart(e, "contacts")}
            >
                <div className="space-y-1 text-[9px] font-medium min-w-0">
                    {allPhones.map((ph, i) => (
                        <div key={`phone-${i}`} className="flex items-center gap-1.5 opacity-90 truncate">
                            <Phone style={{ color: resolvedTextColor }} className="w-2.5 h-2.5 shrink-0 opacity-85" />
                            <span>{ph}</span>
                        </div>
                    ))}
                    {allEmails.map((em, i) => (
                        <div key={`email-${i}`} className="flex items-center gap-1.5 opacity-90 truncate">
                            <Mail style={{ color: resolvedTextColor }} className="w-2.5 h-2.5 shrink-0 opacity-85" />
                            <span>{em}</span>
                        </div>
                    ))}
                    {services.length > 0 && (
                        <div className="flex items-center gap-1.5 opacity-75 mt-0.5 truncate">
                            <Briefcase style={{ color: resolvedTextColor }} className="w-2.5 h-2.5 shrink-0 opacity-85" />
                            <span className="italic">{services.slice(0, 3).join(" • ")}</span>
                        </div>
                    )}
                </div>

                {isEditable && (
                    <div
                        onMouseDown={(e) => handleResizeStart(e, "contacts")}
                        onTouchStart={(e) => handleResizeStart(e, "contacts")}
                        className="absolute right-0 bottom-0 w-3 h-3 bg-primary/75 rounded-tl cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                )}
            </div>
        </div>
    );
}
