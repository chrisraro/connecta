import { DigitalCardConfig } from "../types/profile";

/**
 * The digital-card defaults a brand-new profile starts with, no matter
 * which door created it.
 *
 * Before Task 12, this object only ever existed as a client-side constant
 * inside app/dashboard/builder/page.tsx, so the builder's own "create new
 * profile" Save always stamped a concrete digitalCard onto the row — but
 * onboarding's separate direct-insert path (convex/users.ts) never set
 * digitalCard at all, leaving it `undefined` on every onboarding-created
 * profile. That was one of several structural shape differences between
 * the two creation paths. Hoisting the constant here lets both the client
 * (app/dashboard/builder/page.tsx) and the server (convex/users.ts, via
 * insertNewProfile in convex/profiles.ts) seed the exact same default
 * instead of maintaining two copies that can drift apart again.
 */
export const DEFAULT_DIGITAL_CARD: DigitalCardConfig = {
    backgroundColor: "#1e1e1e",
    textColor: "#ffffff",
    layout: "split",
    showQrCode: true,
    theme: "dark",
    cardBackgroundType: "solid",
    cardGradientStart: "#000000",
    cardGradientEnd: "#333333",
};
