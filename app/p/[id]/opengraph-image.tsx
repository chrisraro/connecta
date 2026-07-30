import { ImageResponse } from "next/og";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { resolveTheme } from "@/components/templates/theme";
import { HERALD } from "@/lib/brand";

export const runtime = "edge";
export const alt = "Herald profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// next/og's edge runtime can't load the next/font instances used elsewhere
// in the app (Task 2's per-template fonts) — those are webpack-bundled
// binaries, not fetchable buffers. Stick to system-safe font stacks here;
// a working plain OG image beats an ambitious broken one.
const SYSTEM_SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const profile = await fetchQuery(api.profiles.getProfile, { profileId: id as Id<"profiles"> }).catch(() => null);

    const palette = profile?.layoutConfig?.colorPalette;
    const theme = resolveTheme(
        profile?.layoutConfig?.themeId ?? "editorial",
        palette && {
            primaryColor: palette.primary,
            backgroundColor: palette.background,
            textColor: palette.text,
            secondaryColor: palette.secondary,
            accentColor: palette.accent,
        }
    );
    const { fullName, title, company } = profile?.agentInfo ?? { fullName: HERALD.name, title: HERALD.tagline, company: "" };

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    backgroundColor: theme.colors.background,
                    padding: "80px",
                    fontFamily: SYSTEM_SANS,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        maxWidth: "980px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            fontSize: 30,
                            fontWeight: 600,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: theme.colors.accent,
                            marginBottom: "28px",
                        }}
                    >
                        {HERALD.name}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            fontSize: 76,
                            fontWeight: 700,
                            lineHeight: 1.08,
                            color: theme.colors.ink,
                        }}
                    >
                        {fullName}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            fontSize: 38,
                            marginTop: "24px",
                            color: theme.colors.inkSoft,
                        }}
                    >
                        {[title, company].filter(Boolean).join(" · ")}
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderTop: `2px solid ${theme.colors.line}`,
                        paddingTop: "32px",
                    }}
                >
                    <div style={{ display: "flex", fontSize: 26, color: theme.colors.inkSoft }}>
                        {HERALD.tagline}
                    </div>
                    <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: theme.colors.accent }}>
                        {HERALD.domain}
                    </div>
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
