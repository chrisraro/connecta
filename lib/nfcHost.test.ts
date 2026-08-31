import { expect, test, describe } from "vitest";
import { resolveNfcHost } from "./nfcHost";

// Task 6b: PRODUCTION_DOMAIN in app/admin/factory/page.tsx used to fall back
// to a hardcoded host (`https://sigmatap.vercel.app`) whenever
// NEXT_PUBLIC_APP_URL was unset. That fallback silently rotted once — a
// frozen host survived two brand passes on the reasoning that the deployment
// hadn't moved, and by the third rename it was 404ing while still being
// encoded onto physical NFC tags. This function has NO fallback: the caller
// must treat `null` as "writing is unavailable," not fill in a guess.
describe("resolveNfcHost", () => {
    test("returns the configured value unchanged", () => {
        expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "https://example.com" })).toBe(
            "https://example.com"
        );
    });

    test("strips a single trailing slash", () => {
        expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "https://x.com/" })).toBe(
            "https://x.com"
        );
    });

    test("strips multiple trailing slashes", () => {
        expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "https://x.com///" })).toBe(
            "https://x.com"
        );
    });

    test("returns null when unset", () => {
        expect(resolveNfcHost({})).toBeNull();
    });

    test("returns null for an empty string", () => {
        expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "" })).toBeNull();
    });

    test("returns null for a whitespace-only value", () => {
        expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "   " })).toBeNull();
    });

    test("trims surrounding whitespace off a real value", () => {
        expect(resolveNfcHost({ NEXT_PUBLIC_APP_URL: "  https://x.com  " })).toBe(
            "https://x.com"
        );
    });

    test("never falls back to a hardcoded host", () => {
        const result = resolveNfcHost({});
        expect(result).toBeNull();
        expect(String(result)).not.toContain("sigmatap");
    });
});
