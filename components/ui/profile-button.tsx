"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface ProfileButtonProps {
    icon: React.ElementType;
    label: string;
    value: string;
    href?: string;
    color: string;
    bgColor: string;
}

export function ProfileButton({ icon: Icon, label, value, href, color, bgColor }: ProfileButtonProps) {
    const [isCopied, setIsCopied] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent link click if wrapped
        e.stopPropagation();
        navigator.clipboard.writeText(value);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const innerContent = (
        <div
                className="group relative flex items-center justify-center h-12 rounded-full transition-all duration-300 ease-out overflow-hidden shadow-sm hover:shadow-md"
                style={{
                    backgroundColor: bgColor,
                    color: color,
                    width: isHovered ? "auto" : "3rem", // 12 * 4px = 48px = 3rem
                    paddingRight: isHovered ? "1rem" : "0"
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Icon Container - Always Visible */}
                <div className="w-12 h-12 flex flex-shrink-0 items-center justify-center z-10">
                    <Icon className="w-5 h-5" />
                </div>

                {/* Content - Revealed on Hover */}
                {isHovered && (
                    <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200">
                        <span className="text-sm font-medium">{label}</span>

                        {/* Copy Button */}
                        <div
                            role="button"
                            onClick={handleCopy}
                            className="ml-1 p-1.5 rounded-full bg-black/10 hover:bg-black/20 transition-colors"
                            title="Copy to clipboard"
                        >
                            {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </div>
                    </div>
                )}
        </div>
    );

    if (href) {
        return <a href={href} target="_blank" rel="noopener noreferrer" className="block">{innerContent}</a>;
    }
    return <div className="cursor-pointer">{innerContent}</div>;
}
