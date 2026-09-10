"use client";

import Image from "next/image";
import { imageUrl as resolveStorageUrl, isOwnStorageUrl } from "@/lib/imageUrl";

interface ProfileImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackSeed?: string;
  fill?: boolean;
  width?: number;
  height?: number;
}

// next/image requires an absolute URL or a root-relative path — anything
// else (e.g. a bare Convex storage id still awaiting resolution) makes
// next/image throw synchronously instead of just failing to load like a
// plain <img> would.
function isRenderableUrl(url: string): boolean {
  return (
    url.startsWith("http") ||
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("/")
  );
}

export function ProfileImage({
  src,
  alt,
  className = "",
  fallbackSeed,
  fill = true,
  width,
  height,
}: ProfileImageProps) {
  // One pure derivation, no query. The bucket is public, so a stored path
  // resolves to a URL by string concatenation -- which is why the batch
  // `resolvedImages` map and the per-image fallback query that existed to
  // avoid N round trips are both gone.
  const imageUrl = resolveStorageUrl(src) ?? "";

  const finalUrl =
    imageUrl ||
    (fallbackSeed
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fallbackSeed)}`
      : "");

  if (!finalUrl || !isRenderableUrl(finalUrl)) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <span className="text-muted-foreground text-xs">No Image</span>
      </div>
    );
  }

  // Next's image optimizer (a) requires every remote host to be allow-listed
  // in next.config.ts images.remotePatterns and (b) rejects SVGs by default.
  // Both are guaranteed only for URLs we derived ourselves from our own
  // storage bucket -- an arbitrary direct URL (an OAuth avatar on some
  // provider host) or the Dicebear SVG fallback would otherwise throw and
  // take the whole page down, so those are served unoptimized. They are still
  // real next/image elements (native lazy loading, no layout shift); they
  // just skip the resize/reencode pipeline.
  const unoptimized = !isOwnStorageUrl(finalUrl);

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
