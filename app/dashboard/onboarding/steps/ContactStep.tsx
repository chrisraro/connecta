import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Step 4 (required): phone required, email read-only, website optional. */
export function ContactStep({
  email,
  phone,
  website,
  onPhoneChange,
  onWebsiteChange,
}: {
  email: string;
  phone: string;
  website: string;
  onPhoneChange: (v: string) => void;
  onWebsiteChange: (v: string) => void;
}) {
  return (
    <div className="flex-1 space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={email} disabled className="opacity-60" />
        <p className="text-xs text-muted-foreground">From your account. Change it in account settings.</p>
      </div>
      <div className="space-y-2">
        <Label>Phone</Label>
        <Input
          placeholder="+63 917 123 4567"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>
          Website <span className="text-xs text-muted-foreground">(optional)</span>
        </Label>
        <Input
          placeholder="https://yoursite.com"
          value={website}
          onChange={(e) => onWebsiteChange(e.target.value)}
        />
      </div>
    </div>
  );
}
