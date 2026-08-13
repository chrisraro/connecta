import { Quote } from "lucide-react";
import { ProfileInfo } from "@/types/profile";
import { TemplateTheme } from "../theme";
import { SectionShell } from "./SectionShell";

type Testimonials = NonNullable<ProfileInfo["testimonials"]>;

export function TestimonialsSection({ testimonials, theme, index }: { testimonials: Testimonials; theme: TemplateTheme; index: number }) {
  return (
    <SectionShell theme={theme} index={index} heading="Recommendations" surface>
      <div className="space-y-6">
        {testimonials.map((testimonial, i) => (
          <div key={i} className="rounded-[var(--r-lg)] p-6" style={{ backgroundColor: theme.colors.background }}>
            <Quote className="w-8 h-8 mb-4" style={{ color: theme.colors.accent }} />
            <p
              className="text-base leading-relaxed mb-4"
              style={{ color: theme.colors.ink, fontFamily: `var(${theme.fontVars.display})` }}
            >
              &ldquo;{testimonial.quote}&rdquo;
            </p>
            <div>
              <p className="text-sm font-medium" style={{ color: theme.colors.ink }}>{testimonial.author}</p>
              {testimonial.role && (
                <p className="text-xs mt-0.5" style={{ color: theme.colors.inkSoft }}>{testimonial.role}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
