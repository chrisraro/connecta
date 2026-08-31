import {
  Fraunces,
  Geist,
  Geist_Mono,
  Manrope,
  Space_Grotesk,
  Newsreader,
} from "next/font/google";

/** Connecta's own display face — high-contrast variable serif with real character. */
export const displayFont = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axes: ["SOFT", "WONK", "opsz"],
});

/** App UI + body. Serif is banned on dashboard surfaces. */
export const bodyFont = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export const monoFont = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

/** Per-template faces. Each template's identity is primarily typographic,
 *  so these must actually load — see Task 2's TemplateTheme.fontVars. */
export const editorialSerif = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-tpl-editorial",
});

export const kineticGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-tpl-kinetic",
});

export const architecturalSans = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-tpl-architectural",
});

/** Every font variable class, for the <html> element. */
export const allFontVariables = [
  displayFont.variable,
  bodyFont.variable,
  monoFont.variable,
  editorialSerif.variable,
  kineticGrotesk.variable,
  architecturalSans.variable,
].join(" ");
