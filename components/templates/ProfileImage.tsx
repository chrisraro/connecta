"use client";

import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { resolveImageUrl } from "@/lib/utils";

interface ProfileImageProps {
    src?: string;
    alt: string;
    className?: string;
    fallbackSeed?: string;
    resolvedImages?: Record<string, string>;
    fill?: boolean;
    width?: number;
    height?: number;
}

// next/image requires an absolute URL or a root-relative path — anything
// else (e.g. a bare Convex storage id still awaiting resolution) makes
// next/image throw synchronously instead of just failing to load like a
// plain <img> would.
function isRenderableUrl(url: string): boolean {
    return url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("/");
}

export function ProfileImage({
    src,
    alt,
    className = "",
    fallbackSeed,
    resolvedImages,
    fill = true,
    width,
    height,
}: ProfileImageProps) {
    const isDirectUrl = src?.startsWith("http") || src?.startsWith("data:") || src?.startsWith("blob:");
    const batchResolved = src && !isDirectUrl ? resolvedImages?.[src] : undefined;

    // Only fall back to a per-image query when the caller didn't supply a
    // resolvedImages map (e.g. a src reached outside of profiles.getProfile's
    // response) — the common path (public profile pages) never hits this.
    const storageUrl = useQuery(
        api.images.getImageUrl,
        src && !isDirectUrl && !batchResolved && !resolvedImages ? { storageId: src } : "skip"
    );

    let imageUrl = "";
    // Tracks whether `imageUrl` came from resolving a Convex storage id
    // (either the batch `resolvedImages` map or the per-image query) — the
    // only case where the host is guaranteed to be the allow-listed
    // `*.convex.cloud`, so it's the only case safe to run through Next's
    // image optimizer.
    let isConvexResolved = false;
    if (isDirectUrl) {
        imageUrl = src as string;
    } else if (batchResolved) {
        imageUrl = batchResolved;
        isConvexResolved = true;
    } else if (storageUrl) {
        imageUrl = storageUrl;
        isConvexResolved = true;
    } else if (src) {
        const resolved = resolveImageUrl(src);
        // resolveImageUrl only returns something different from `src` when
        // `src` was already a full URL (already covered by isDirectUrl
        // above); for a bare storage id still awaiting resolution it just
        // echoes the id back, which is not a renderable URL.
        if (isRenderableUrl(resolved)) imageUrl = resolved;
    }

    const finalUrl = imageUrl || (fallbackSeed
        ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fallbackSeed)}`
        : "");

    if (!finalUrl || !isRenderableUrl(finalUrl)) {
        return (
            <div className={`bg-muted flex items-center justify-center ${className}`}>
                <span className="text-muted-foreground text-xs">No Image</span>
            </div>
        );
    }

    // Next's image optimizer (a) requires every remote host to be
    // allow-listed in next.config.ts's `images.remotePatterns` and (b)
    // rejects SVGs by default. We can only guarantee both for URLs we
    // resolved ourselves from Convex storage — an arbitrary direct URL
    // (e.g. a profile's avatarUrl pointing at a Clerk-hosted OAuth photo on
    // img.clerk.com) or the Dicebear SVG fallback would otherwise throw and
    // take down the whole page, so those are served unoptimized instead.
    // They still render as real next/image elements (native lazy-loading,
    // no layout shift) — they just skip Next's resize/reencode pipeline.
    const unoptimized = !isConvexResolved;

    if (fill) {
        return (
            <div className={`relative ${className}`}>
                <Image
                    src={finalUrl}
                    alt={alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover"
                    unoptimized={unoptimized}
                />
            </div>
        );
    }

    return (
        <Image
            src={finalUrl}
            alt={alt}
            width={width ?? 200}
            height={height ?? 200}
            className={className}
            unoptimized={unoptimized}
        />
    );
}
