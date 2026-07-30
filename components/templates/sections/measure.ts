import { TemplateTheme } from "../theme";

/** Content width class for a template's chosen measure. */
export function measureClass(theme: TemplateTheme): string {
  switch (theme.composition.measure) {
    case "narrow":
      return "max-w-md mx-auto px-6";
    case "wide":
      return "max-w-2xl mx-auto px-6";
    case "full":
      return "w-full px-6 md:px-12";
  }
}

/** Vertical rhythm class for a template's chosen cadence. */
export function rhythmClass(theme: TemplateTheme): string {
  switch (theme.composition.rhythm) {
    case "tight":
      return "py-10 md:py-14";
    case "generous":
      return "py-14 md:py-20";
    case "cinematic":
      return "py-20 md:py-32";
  }
}

/** Combined measure + rhythm class for a section's content wrapper. */
export function sectionClass(theme: TemplateTheme): string {
  return `${measureClass(theme)} ${rhythmClass(theme)}`;
}
