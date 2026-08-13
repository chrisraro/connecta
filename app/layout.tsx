import type { Metadata } from "next";
import { allFontVariables } from "@/lib/fonts";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CartProvider } from "@/contexts/CartContext";
import { HERALD } from "@/lib/brand";

// Without a metadataBase, every relative OG/Twitter image URL (e.g. the
// per-profile opengraph-image routes) resolves against Next's localhost
// default in production, breaking link previews. NEXT_PUBLIC_APP_URL is the
// same var used for payment redirect URLs (see README/.env.example) — reuse
// it here rather than introduce a second "what's my public URL" setting.
const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${HERALD.domain}`;

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: `${HERALD.name} — Your business card, reinvented`,
  description:
    "Premium NFC digital business cards for modern professionals. Tap to share a stunning profile and capture leads instantly.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  // Default OG/Twitter card for every page that doesn't generate its own
  // (the /p/[id] and /[slug] profile routes each have their own dynamic
  // opengraph-image.tsx, which Next uses in place of this per-route).
  openGraph: {
    title: `${HERALD.name} — Your business card, reinvented`,
    description:
      "Premium NFC digital business cards for modern professionals. Tap to share a stunning profile and capture leads instantly.",
    images: ["/og-fallback.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-fallback.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={allFontVariables}>
      <body className="antialiased">
        <ConvexClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <CartProvider>
              {children}
            </CartProvider>
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
