"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

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
  return (
    <NextThemesProvider scriptProps={scriptProps} {...props}>
      {children}
    </NextThemesProvider>
  );
}
