import type { ImgHTMLAttributes } from "react";

/** next/image without Next.js: a plain img. `fill` maps to absolute cover. */
type Props = ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean; unoptimized?: boolean };

export default function Image({ fill, priority, unoptimized, style, alt = "", ...rest }: Props) {
  void priority;
  void unoptimized;
  const cover = fill ? { position: "absolute" as const, inset: 0, width: "100%", height: "100%", objectFit: "cover" as const } : {};
  return <img alt={alt} {...rest} style={{ ...cover, ...style }} />;
}
