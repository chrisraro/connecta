import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ProfileView } from "./ProfileView";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const profile = await fetchQuery(api.profiles.getProfile, { profileId: id as Id<"profiles"> }).catch(() => null);
    if (!profile) return { title: "Profile not found — Herald" };

    const { fullName, title, company, about } = profile.agentInfo;
    const heading = [fullName, title].filter(Boolean).join(" — ");
    const description = about?.slice(0, 160) || [title, company].filter(Boolean).join(" at ") || `${fullName} on Herald`;

    return {
        title: `${heading} | Herald`,
        description,
        openGraph: { title: heading, description, type: "profile" },
        twitter: { card: "summary_large_image", title: heading, description },
    };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <ProfileView lookup={{ by: "id", profileId: id }} />;
}
