import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUGGESTED_SERVICES } from "@/lib/onboardingFlow";

/** Step 5 (skippable): about + services. */
export function WorkStep({
  about,
  services,
  serviceInput,
  onAboutChange,
  onServiceInputChange,
  onAddService,
  onRemoveService,
}: {
  about: string;
  services: string[];
  serviceInput: string;
  onAboutChange: (v: string) => void;
  onServiceInputChange: (v: string) => void;
  onAddService: (v: string) => void;
  onRemoveService: (v: string) => void;
}) {
  return (
    <div className="flex-1 space-y-4 pt-4">
      <div className="space-y-2">
        <Label>About / bio</Label>
        <textarea
          className="flex min-h-[80px] w-full border-[1.5px] border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Tell clients what you do and what makes you unique."
          value={about}
          onChange={(e) => onAboutChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Services offered</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Type a service, press Enter"
            value={serviceInput}
            onChange={(e) => onServiceInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddService(serviceInput);
              }
            }}
          />
          <Button type="button" variant="outline" onClick={() => onAddService(serviceInput)}>
            Add
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTED_SERVICES.filter((s) => !services.includes(s))
            .slice(0, 8)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onAddService(s)}
                className="border border-dashed border-input px-2 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                + {s}
              </button>
            ))}
        </div>
        {services.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border pt-3">
            {services.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1 border-[1.5px] border-input px-2 py-0.5 text-[13px] font-medium"
              >
                {s}
                <button
                  type="button"
                  onClick={() => onRemoveService(s)}
                  aria-label={`Remove ${s}`}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
