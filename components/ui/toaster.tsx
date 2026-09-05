"use client";

import { useTheme } from "next-themes";
import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

/**
 * Thin wrapper around sonner's <Toaster /> so it picks up this app's
 * light/dark theme (next-themes, same source ThemeToggle reads/writes) and
 * matches the design tokens already in use elsewhere (app/globals.css's
 * --r-md radius and --e-overlay elevation, plus the shadcn card/border/
 * foreground CSS variables) instead of sonner's own default look.
 */
export function Toaster(props: ToasterProps) {
  const { theme } = useTheme();

  return (
    <SonnerToaster
      theme={theme === "dark" ? "dark" : theme === "light" ? "light" : "system"}
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "var(--card)",
          color: "var(--card-foreground)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          boxShadow: "var(--e-overlay)",
        },
        className: "font-sans",
      }}
      {...props}
    />
  );
}
