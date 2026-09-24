import type { Metadata, Viewport } from "next";
import { allFontVariables } from "@/lib/fonts";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CartProvider } from "@/contexts/CartContext";
import { CONNECTA } from "@/lib/brand";
import { appOrigin } from "@/lib/appUrl";
import { Toaster } from "@/components/ui/toaster";

// Without a metadataBase, every relative OG/Twitter image URL (e.g. the
// per-profile opengraph-image routes) resolves against Next's localhost
// default in production, breaking link previews. NEXT_PUBLIC_APP_URL is the
// same var used for payment redirect URLs (see README/.env.example) — reuse
// it here rather than introduce a second "what's my public URL" setting.
// appOrigin tolerates a bare host (Vercel's env UI allows one; new URL() doesn't,
// which failed a production build) and falls back to the brand domain.
const appUrl = appOrigin(process.env.NEXT_PUBLIC_APP_URL) ?? `https://${CONNECTA.domain}`;

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: `${CONNECTA.name} — One tap. They have your number.`,
  description:
    "NFC + QR business cards that open a professional profile on any phone, with no app to install, and send every enquiry back to you. Built for Naga first.",
  icons: {
    icon: [
      // The vector lot mark first; the rasters are exported from the same
      // artwork for browsers and platforms without SVG icon support.
      { url: "/brand/connecta-icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico?v=2", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png?v=2",
  },
  manifest: "/manifest.json",
  // Default OG/Twitter card for every page that doesn't generate its own
  // (the /p/[id] and /[slug] profile routes each have their own dynamic
  // opengraph-image.tsx, which Next uses in place of this per-route).
  openGraph: {
    title: `${CONNECTA.name} — One tap. They have your number.`,
    description:
      "NFC + QR business cards that open a professional profile on any phone, with no app to install, and send every enquiry back to you. Built for Naga first.",
    images: ["/og-fallback.png?v=2"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-fallback.png?v=2"],
  },
};

// The browser chrome takes the sheet colour: whiteprint, or graphite in dark.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EEF1F4" },
    { media: "(prefers-color-scheme: dark)", color: "#12161F" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={allFontVariables}>
      <body className="antialiased">
        <AppProviders>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <CartProvider>
              {children}
              <Toaster />
            </CartProvider>
          </ThemeProvider>
        </AppProviders>
      </body>
    </html>
  );
}
