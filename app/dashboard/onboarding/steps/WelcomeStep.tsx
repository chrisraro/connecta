import { CONNECTA } from "@/lib/brand";

/**
 * Step 1: one short plain paragraph of what setup covers. No feature tiles,
 * no icons, no emoji — restrained Survey Plan copy per the 2026-09-27 owner
 * decision.
 */
export function WelcomeStep() {
  return (
    <div className="flex-1 flex flex-col justify-center space-y-4">
      <p className="text-muted-foreground leading-relaxed">
        Let&apos;s set up your {CONNECTA.name} profile: your account type, your name and
        contact details, and — if you want — your work, a profile style, a card skin and a
        photo. It takes a couple of minutes, and everything after the first few steps can be
        changed later.
      </p>
    </div>
  );
}
