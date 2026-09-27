import { Building2, CheckCircle2, Store, User } from "lucide-react";
import type { ProfileCategory } from "@/lib/onboardingFlow";

const PROFILE_CATEGORIES: { id: ProfileCategory; label: string; desc: string; icon: React.ElementType }[] = [
  { id: "individual", label: "Individual", desc: "Freelancer, creator, professional", icon: User },
  { id: "company", label: "Company / agency", desc: "Team, studio, agency", icon: Building2 },
  { id: "business", label: "Business", desc: "Store, brand, service provider", icon: Store },
];

export { PROFILE_CATEGORIES };

/** Step 2 (required): account type. Lucide icons only — no emoji. */
export function TypeStep({
  value,
  onChange,
}: {
  value: ProfileCategory;
  onChange: (category: ProfileCategory) => void;
}) {
  return (
    <div className="flex-1 space-y-4 pt-4">
      <p className="text-sm text-muted-foreground">What best describes your profile?</p>
      <div className="grid gap-3">
        {PROFILE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = value === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              aria-pressed={isSelected}
              className={`flex items-center gap-4 border-[1.5px] p-4 text-left transition-colors ${
                isSelected ? "border-input bg-accent" : "border-border hover:border-input hover:bg-accent/50"
              }`}
            >
              <Icon className="h-6 w-6 shrink-0 text-foreground" strokeWidth={1.75} aria-hidden="true" />
              <div>
                <div className="font-semibold">{cat.label}</div>
                <div className="text-xs text-muted-foreground">{cat.desc}</div>
              </div>
              {isSelected && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-primary" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
