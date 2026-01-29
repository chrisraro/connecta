import { TemplateProps } from "@/types/profile";
import { Phone, Mail, Globe } from "lucide-react";
import Link from "next/link";

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
            <div className="relative">
                <div
                    className="w-32 h-32 rounded-full overflow-hidden border-4"
                    style={{ borderColor: theme.primaryColor }}
                >
                    {/* Use a placeholder if no avatar is provided */}
                    <img
                        src={agent.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + agent.fullName}
                        alt={agent.fullName}
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>

            <div>
                <h1 className="text-3xl font-extrabold tracking-tight mb-1">{agent.fullName}</h1>
                <p className="text-lg opacity-80 font-medium">{agent.title} • {agent.company}</p>
            </div>

            <div className="flex gap-4 flex-wrap justify-center">
                <Link href={`tel:${agent.phone}`}>
                    <button
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                        style={{ backgroundColor: theme.primaryColor, color: theme.backgroundColor }}
                    >
                        <Phone className="w-5 h-5" />
                    </button>
                </Link>
                <Link href={`mailto:${agent.email}`}>
                    <button
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                        style={{ backgroundColor: theme.primaryColor, color: theme.backgroundColor }}
                    >
                        <Mail className="w-5 h-5" />
                    </button>
                </Link>
                {agent.website && (
                    <Link href={agent.website} target="_blank">
                        <button
                            className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                            style={{ backgroundColor: theme.primaryColor, color: theme.backgroundColor }}
                        >
                            <Globe className="w-5 h-5" />
                        </button>
                    </Link>
                )}
            </div>
        </div>
    );
}
