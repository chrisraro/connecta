import type { ImgHTMLAttributes } from "react";
import { staticFile } from "remotion";

/** next/image without Next.js: a plain img. `fill` maps to absolute cover. */
type Props = ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean; unoptimized?: boolean };

/** The site serves /public at "/"; Remotion serves video/public via staticFile. */
function resolveSrc(src: unknown) {
  return typeof src === "string" && src.startsWith("/") && !src.startsWith("//") ? staticFile(src.slice(1)) : src;
}

export default function Image({ fill, priority, unoptimized, style, alt = "", src, ...rest }: Props) {
  void priority;
  void unoptimized;
  const cover = fill ? { position: "absolute" as const, inset: 0, width: "100%", height: "100%", objectFit: "cover" as const } : {};
  return <img alt={alt} {...rest} src={resolveSrc(src) as string | undefined} style={{ ...cover, ...style }} />;
}
