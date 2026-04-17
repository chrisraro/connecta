"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { resolveImageUrl } from "@/lib/utils";

interface ProfileImageProps {
    src?: string;
    alt: string;
    className?: string;
    fallbackSeed?: string;
}

export function ProfileImage({ src, alt, className = "", fallbackSeed }: ProfileImageProps) {
    // Fetch the actual URL if src is a storage ID
    const storageUrl = useQuery(
        api.images.getImageUrl,
        src && !src.startsWith("http") && !src.startsWith("data:") && !src.startsWith("blob:") 
            ? { storageId: src } 
            : "skip"
    );

    // Determine the final URL
    let imageUrl = "";
    if (src?.startsWith("http") || src?.startsWith("data:") || src?.startsWith("blob:")) {
        imageUrl = src;
    } else if (storageUrl) {
        imageUrl = storageUrl;
    } else if (src) {
        imageUrl = resolveImageUrl(src);
    }

    // Fallback to dicebear if no image
    const finalUrl = imageUrl || (fallbackSeed 
        ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fallbackSeed)}`
        : "");

    if (!finalUrl) {
        return (
            <div className={`bg-muted flex items-center justify-center ${className}`}>
                <span className="text-muted-foreground text-xs">No Image</span>
            </div>
        );
    }

    return (
        <img
            src={finalUrl}
            alt={alt}
            className={className}
            onError={(e) => {
                // If image fails to load, show fallback
                if (fallbackSeed) {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fallbackSeed)}`;
                }
            }}
        />
    );
}
