"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { isLightOnlyRoute } from "@/lib/lightOnlyRoutes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  // next-themes' inline script only has to run from the server HTML, before
  // paint. If this subtree is ever rendered on the client (a hydration
  // retry, a client-side boundary), React 19 warns on any executable
  // <script> it creates, and such a script would never run anyway; a
  // data-block type keeps it inert and silent. The type attribute differs
  // between server and client, which next-themes already marks with
  // suppressHydrationWarning.
  const scriptProps = typeof window === "undefined" ? undefined : { type: "application/json" };
  // The public site is light-only; elsewhere the user's choice stands.
  const forcedTheme = isLightOnlyRoute(usePathname()) ? "light" : undefined;
  return (
    <NextThemesProvider scriptProps={scriptProps} forcedTheme={forcedTheme} {...props}>
      {children}
    </NextThemesProvider>
  );
}
