import {
  Archivo,
  Fraunces,
  Geist,
  Geist_Mono,
  JetBrains_Mono,
  Manrope,
  Space_Grotesk,
  Newsreader,
} from "next/font/google";

/** Survey Plan world: title-block lettering and UI. The width axis carries the
 *  expanded display cut, so one family covers both. */
export const surveyFont = Archivo({
  subsets: ["latin"],
  display: "swap",
  axes: ["wdth"],
  variable: "--font-survey",
});

/** Survey Plan world: real data only (prices, dates, codes). */
export const surveyMonoFont = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-survey-mono",
});

/** The product's own display face — high-contrast variable serif with real character. */
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
  surveyFont.variable,
  surveyMonoFont.variable,
].join(" ");
