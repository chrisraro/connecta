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
 *
 * Presence isn't usability: an earlier version of this function accepted
 * any non-empty string, so a scheme-less value like `example.com` (or any
 * other unparseable garbage) passed straight through and got encoded onto a
 * tag. It's now validated with `new URL()` and must be an absolute
 * `http:`/`https:` URL or this returns `null` the same way an empty value
 * does. `localhost` is deliberately NOT rejected here — it's exactly what
 * `.env.example` / `DEVELOPMENT_SETUP.md` tell every developer to set for
 * local dev, and Web NFC works fine against port-forwarded localhost on
 * Chrome for Android. The caller is responsible for making that host
 * visible to the operator before it's burned into a tag — see the
 * `nfcHost`-adjacent UI in app/admin/factory/page.tsx.
 */
export function resolveNfcHost(env: Record<string, string | undefined>): string | null {
  const raw = env.NEXT_PUBLIC_APP_URL;
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (trimmed === "") return null;

  const withoutTrailingSlashes = trimmed.replace(/\/+$/, "");

  let parsed: URL;
  try {
    parsed = new URL(withoutTrailingSlashes);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  return withoutTrailingSlashes;
}
