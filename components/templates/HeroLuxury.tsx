import { TemplateProps } from "@/types/profile";
import { Phone, Mail, Globe, MapPin, Download, Facebook, Instagram, Linkedin, Twitter, Youtube, Link as LinkIcon } from "lucide-react";
import { ProfileButton } from "@/components/ui/profile-button";
import { Button } from "@/components/ui/button";
import { downloadVCard } from "@/lib/vcard";
import { resolveImageUrl } from "@/lib/utils";

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

    return (
        <div
            className="relative pt-20 pb-12 px-8 text-center border-b shadow-2xl"
            style={{
                backgroundColor: theme.backgroundColor,
                color: theme.textColor,
                borderColor: `${theme.primaryColor}20`
            }}
        >
            {/* Background Accent */}
            <div
                className="absolute top-0 left-0 w-full h-32 opacity-10"
                style={{
                    background: `linear-gradient(to bottom, ${theme.primaryColor}, transparent)`
                }}
            />

            <div className="relative mb-8">
                <div
                    className="w-36 h-36 mx-auto rounded-2xl overflow-hidden border-2 p-1 transform rotate-3 hover:rotate-0 transition-transform duration-500 shadow-2xl"
                    style={{ borderColor: theme.primaryColor }}
                >
                    <img
                        src={resolveImageUrl(agent.avatarUrl) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${agent.fullName}`}
                        alt={agent.fullName}
                        className="w-full h-full object-cover rounded-xl"
                    />
                </div>
            </div>

            <div className="space-y-3 mb-10">
                <h1 className="text-5xl font-black tracking-tighter uppercase italic" style={{ color: theme.primaryColor }}>
                    {agent.fullName}
                </h1>
                <div className="flex flex-col items-center gap-1">
                    <p className="text-sm font-bold tracking-[0.2em] uppercase opacity-60">
                        {agent.title}
                    </p>
                    <div className="h-px w-12 my-2" style={{ backgroundColor: theme.primaryColor }} />
                    <p className="text-sm font-medium tracking-widest uppercase italic opacity-80">
                        {agent.company}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-10">
                {agent.phone && (
                    <ProfileButton
                        icon={Phone}
                        label="Call"
                        value={agent.phone}
                        href={`tel:${agent.phone}`}
                        color={theme.textColor}
                        bgColor={`${theme.primaryColor}15`}
                    />
                )}
                {agent.email && (
                    <ProfileButton
                        icon={Mail}
                        label="Email"
                        value={agent.email}
                        href={`mailto:${agent.email}`}
                        color={theme.textColor}
                        bgColor={`${theme.primaryColor}15`}
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
                            color={theme.textColor}
                            bgColor={`${theme.primaryColor}15`}
                        />
                    );
                })}
            </div>

            <div className="flex justify-center">
                <Button
                    onClick={() => downloadVCard(agent)}
                    variant="outline"
                    className="rounded-full px-10 h-14 font-black uppercase tracking-widest text-xs border-2 hover:scale-105 transition-all shadow-xl"
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
