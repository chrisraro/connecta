import type { Metadata } from "next";
import { allFontVariables } from "@/lib/fonts";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CartProvider } from "@/contexts/CartContext";

export const metadata: Metadata = {
  title: "Herald — Your business card, reinvented",
  description:
    "Premium NFC digital business cards for modern professionals. Tap to share a stunning profile and capture leads instantly.",
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
  manifest: "/manifest.json",
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
