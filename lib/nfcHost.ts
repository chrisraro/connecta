/**
 * Resolves the host that physical NFC tags are encoded with — see the
 * comment above the caller in app/admin/factory/page.tsx for why a wrong
 * value here is not cosmetic.
 *
 * Deliberately has NO fallback. A previous version of this logic defaulted
 * to a hardcoded host whenever NEXT_PUBLIC_APP_URL was unset, on the
 * reasoning that the deployment hadn't moved. That reasoning silently
 * expired: the frozen host eventually started 404ing while still being
 * written onto shipped hardware. Returning `null` here forces every caller
 * to refuse to write instead of guessing.
 */
export function resolveNfcHost(
    env: Record<string, string | undefined>
): string | null {
    const raw = env.NEXT_PUBLIC_APP_URL;
    if (typeof raw !== "string") return null;

    const trimmed = raw.trim();
    if (trimmed === "") return null;

    return trimmed.replace(/\/+$/, "");
}
