import type { Tables } from "@/lib/supabase/database.types";
import type { ProfileInfo } from "@/types/profile";

export type ProfileRow = Tables<"profiles">;

/**
 * The profile-page template selection. Declared here rather than imported:
 * types/profile.ts describes the CARD (ProfileInfo, DigitalCardConfig) and
 * never had a name for this one, so the shape lived only in the Convex
 * validator and in lib/profileOgImage.tsx reading it structurally.
 */
export interface LayoutConfig {
  themeId: string;
  colorPalette: {
    primary: string;
    background: string;
    text: string;
    secondary?: string;
    accent?: string;
  };
  componentOrder: string[];
  heroStyle: string;
}

/**
 * Typed accessors for the jsonb columns on `profiles`.
 *
 * The generated types describe agent_info and layout_config as `Json`, which
 * is accurate -- Postgres does not know their shape -- but useless at every
 * call site. Rather than sprinkle casts through the UI, the assertion lives
 * here once, next to a note about what actually guarantees it.
 *
 * What guarantees it: these columns are only ever written by this application,
 * through the builder, in the shapes declared in types/profile.ts. They are
 * jsonb precisely because nothing queries INTO them (see the migration note on
 * the jsonb-vs-normalized line) -- they are rendered as a block. So a
 * mis-shaped row is a bug in our own writer, not untrusted input.
 *
 * The fallback matters regardless: a profile created before a field existed
 * simply lacks it, and every consumer expects an object rather than null.
 */
export function agentInfoOf(profile: Pick<ProfileRow, "agent_info">): ProfileInfo {
  return (profile.agent_info ?? {}) as unknown as ProfileInfo;
}

export function layoutConfigOf(profile: Pick<ProfileRow, "layout_config">): LayoutConfig {
  return (profile.layout_config ?? {}) as unknown as LayoutConfig;
}

/** Profile-embedded content blocks: all optional, all rendered as lists. */
export function jsonArrayOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * The onboarding snapshot stored on users.onboarding_data.
 *
 * Mirrors the Convex validator it replaces. It is a SNAPSHOT, not live data:
 * the builder prefills a blank form from it once, and the profile is the
 * source of truth from then on -- which is why an already-edited profile must
 * never be re-prefilled from here.
 */
export interface OnboardingData {
  profileCategory?: "individual" | "company" | "business";
  email?: string;
  fullName?: string;
  title?: string;
  company?: string;
  phone?: string;
  website?: string;
  about?: string;
  avatarUrl?: string;
  services?: string[];
  socialLinks?: { platform: string; url: string }[];
}

export function onboardingDataOf(value: unknown): OnboardingData {
  return (value ?? {}) as OnboardingData;
}
