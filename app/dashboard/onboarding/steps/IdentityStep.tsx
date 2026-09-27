import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfileCategory } from "@/lib/onboardingFlow";
import { categoryFieldRules } from "@/lib/onboardingFlow";

interface CategoryFieldCopy {
  nameLabel: string;
  namePlaceholder: string;
  titleLabel: string;
  titlePlaceholder: string;
  companyLabel: string;
  companyPlaceholder: string;
}

const CATEGORY_FIELD_COPY: Record<ProfileCategory, CategoryFieldCopy> = {
  individual: {
    nameLabel: "Full name",
    namePlaceholder: "e.g. Maria Santos",
    titleLabel: "Job title / role",
    titlePlaceholder: "e.g. Brand designer, real estate broker",
    companyLabel: "Company / organization",
    companyPlaceholder: "e.g. Freelance, Acme Corp.",
  },
  company: {
    nameLabel: "Company / agency name",
    namePlaceholder: "e.g. Santos Creative Studio",
    titleLabel: "Industry",
    titlePlaceholder: "e.g. Design agency, marketing firm",
    companyLabel: "Team size",
    companyPlaceholder: "e.g. 5-10, 50+",
  },
  business: {
    nameLabel: "Business name",
    namePlaceholder: "e.g. Santos Coffee Co.",
    titleLabel: "Business type",
    titlePlaceholder: "e.g. Coffee shop, boutique, clinic",
    companyLabel: "Location",
    companyPlaceholder: "e.g. Naga City, Camarines Sur",
  },
};

/** Step 3 (required): name, title/role, and company/location per category. */
export function IdentityStep({
  category,
  fullName,
  title,
  company,
  onFullNameChange,
  onTitleChange,
  onCompanyChange,
}: {
  category: ProfileCategory;
  fullName: string;
  title: string;
  company: string;
  onFullNameChange: (v: string) => void;
  onTitleChange: (v: string) => void;
  onCompanyChange: (v: string) => void;
}) {
  const copy = CATEGORY_FIELD_COPY[category];
  const { companyRequired } = categoryFieldRules(category);

  return (
    <div className="flex-1 space-y-4 pt-4">
      <div className="space-y-2">
        <Label>{copy.nameLabel}</Label>
        <Input
          placeholder={copy.namePlaceholder}
          value={fullName}
          onChange={(e) => onFullNameChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{copy.titleLabel}</Label>
        <Input
          placeholder={copy.titlePlaceholder}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>
          {copy.companyLabel}
          {!companyRequired && <span className="ml-1 text-xs text-muted-foreground">(optional)</span>}
        </Label>
        <Input
          placeholder={copy.companyPlaceholder}
          value={company}
          onChange={(e) => onCompanyChange(e.target.value)}
        />
      </div>
    </div>
  );
}
