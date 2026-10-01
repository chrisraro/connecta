import type { Metadata } from "next";
import { CONNECTA } from "@/lib/brand";

// The tap page is a client component, so its tab title is set here; it used
// to inherit the homepage's.
export const metadata: Metadata = {
  title: `Opening card — ${CONNECTA.name}`,
  robots: { index: false, follow: false },
};

export default function TapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
