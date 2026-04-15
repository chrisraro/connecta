import { TemplateProps } from "@/types/profile";
import { Phone, Mail, Globe, MapPin, Download, Facebook, Instagram, Linkedin, Twitter, Youtube, Link as LinkIcon } from "lucide-react";
import { ProfileButton } from "@/components/ui/profile-button";
import { Button } from "@/components/ui/button";
import { downloadVCard } from "@/lib/vcard";

const SOCIAL_ICONS: Record<string, React.ElementType> = {
    "Instagram": Instagram,
    "Facebook": Facebook,
    "LinkedIn": Linkedin,
    "Twitter": Twitter,
    "TikTok": LinkIcon,
    "YouTube": Youtube,
    "Website": Globe
};

export default function HeroLuxury({ data }: TemplateProps) {
    const { agent, theme } = data;
    // Luxury theme often overrides user colors with Gold/Black/White, but we can respect them softly or use them for accents.
    // For this implementation, we'll respect the passed theme for structure but maintain the luxury layout.

    return (
        <div
            className="py-16 px-8 text-center flex flex-col items-center"
            style={{
                backgroundColor: theme.backgroundColor,
                color: theme.textColor
            }}
        >
            <div className="uppercase tracking-[0.3em] text-xs font-semibold mb-8 opacity-60">
                Exclusive Real Estate
            </div>

            <div className="mb-10 w-full max-w-2xl">
                <div className="relative inline-block mb-6">
                    <img
                        src={agent.avatarUrl || `https://api.dicebear.com/7.x/miniavs/svg?seed=${agent.fullName}`}
                        alt={agent.fullName}
                        className="w-32 h-32 rounded-full mx-auto border-2 p-1"
                        style={{ borderColor: theme.primaryColor }}
                    />
                </div>

                <h1 className="text-5xl font-serif mb-3 tracking-tight">{agent.fullName}</h1>
                <p className="font-serif text-xl italic opacity-90" style={{ color: theme.primaryColor }}>{agent.title}</p>

                <div className="w-16 h-[2px] mx-auto my-8" style={{ backgroundColor: theme.primaryColor }}></div>

                <div className="flex flex-col items-center gap-2 opacity-80 mb-8">
                    <p className="uppercase tracking-widest text-sm font-bold">{agent.company}</p>
                    {agent.address && (
                        <div className="flex items-center gap-2 text-sm font-light">
                            <MapPin className="w-3 h-3" />
                            <span>{agent.address}</span>
                        </div>
                    )}
                </div>

                {/* Interactive Contact Buttons */}
                <div className="flex gap-4 flex-wrap justify-center mb-10">
                    {agent.phone && (
                        <ProfileButton
                            icon={Phone}
                            label="Call"
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
                            label="Web"
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

                {/* Save Contact CTA */}
                <Button
                    onClick={() => downloadVCard(agent)}
                    className="border-2 uppercase tracking-widest text-xs h-12 px-8 transition-all hover:scale-105"
                    variant="outline"
                    style={{
                        borderColor: theme.primaryColor,
                        color: theme.primaryColor,
                        backgroundColor: 'transparent'
                    }}
                >
                    <Download className="w-4 h-4 mr-2" />
                    Save Contact
                </Button>
            </div>
        </div>
    );
}
