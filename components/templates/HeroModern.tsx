import { TemplateProps } from "@/types/profile";
import { Phone, Mail, Globe, MapPin, Download, Facebook, Instagram, Linkedin, Twitter, Youtube, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { ProfileButton } from "@/components/ui/profile-button";
import { Button } from "@/components/ui/button";
import { downloadVCard } from "@/lib/vcard";

const SOCIAL_ICONS: Record<string, any> = {
    "Instagram": Instagram,
    "Facebook": Facebook,
    "LinkedIn": Linkedin,
    "Twitter": Twitter,
    "TikTok": LinkIcon, // Lucide doesn't have TikTok yet, usually
    "YouTube": Youtube,
    "Website": Globe
};

export default function HeroModern({ data }: TemplateProps) {
    const { agent, theme } = data;

    return (
        <div
            className="p-8 text-center flex flex-col items-center gap-6"
            style={{
                backgroundColor: theme.backgroundColor,
                color: theme.textColor
            }}
        >
            <div className="relative group">
                <div
                    className="w-32 h-32 rounded-full overflow-hidden border-4 transition-transform duration-500 hover:scale-105 shadow-xl"
                    style={{ borderColor: theme.primaryColor }}
                >
                    <img
                        src={agent.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${agent.fullName}`}
                        alt={agent.fullName}
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <h1 className="text-4xl font-extrabold tracking-tight">{agent.fullName}</h1>
                <p className="text-lg opacity-80 font-medium tracking-wide">{agent.title} • {agent.company}</p>
                {agent.address && (
                    <div className="flex items-center justify-center gap-2 opacity-70 text-sm mt-1">
                        <MapPin className="w-4 h-4" />
                        <span>{agent.address}</span>
                    </div>
                )}
            </div>

            {/* Main Call-to-Actions (Phone, Email, Socials) */}
            <div className="flex gap-3 flex-wrap justify-center w-full max-w-md">
                {agent.phone && (
                    <ProfileButton
                        icon={Phone}
                        label="Call Me"
                        value={agent.phone}
                        href={`tel:${agent.phone}`}
                        color={theme.backgroundColor}
                        bgColor={theme.primaryColor}
                    />
                )}
                {agent.email && (
                    <ProfileButton
                        icon={Mail}
                        label="Email"
                        value={agent.email}
                        href={`mailto:${agent.email}`}
                        color={theme.backgroundColor}
                        bgColor={theme.primaryColor}
                    />
                )}
                {agent.website && (
                    <ProfileButton
                        icon={Globe}
                        label="Website"
                        value={agent.website}
                        href={agent.website}
                        color={theme.backgroundColor}
                        bgColor={theme.primaryColor}
                    />
                )}
                {agent.socialLinks?.map((link, i) => {
                    const Icon = SOCIAL_ICONS[link.platform] || LinkIcon;
                    return (
                        <ProfileButton
                            key={i}
                            icon={Icon}
                            label={link.platform}
                            value={link.url}
                            href={link.url}
                            color={theme.backgroundColor}
                            bgColor={theme.primaryColor}
                        />
                    );
                })}
            </div>

            {/* Native Save Contact */}
            <Button
                onClick={() => downloadVCard(agent)}
                className="w-full max-w-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
                style={{
                    backgroundColor: theme.primaryColor,
                    color: theme.backgroundColor,
                    borderColor: theme.textColor
                }}
            >
                <Download className="w-4 h-4 mr-2" />
                Save Contact
            </Button>
        </div>
    );
}
