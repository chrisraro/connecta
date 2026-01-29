import { TemplateProps } from "@/types/profile";
import { Phone, Mail } from "lucide-react";

export default function HeroLuxury({ data }: TemplateProps) {
    const { agent, theme } = data;

    return (
        <div
            className="py-16 px-8 text-center"
            style={{
                backgroundColor: "#1a1a1a", // Force dark for luxury
                color: "#f5f5f5"
            }}
        >
            <div className="uppercase tracking-[0.3em] text-xs font-semibold mb-6 text-white/60">
                Exclusive Real Estate
            </div>

            <div className="mb-8">
                <img
                    src={agent.avatarUrl || "https://api.dicebear.com/7.x/miniavs/svg?seed=" + agent.fullName}
                    alt={agent.fullName}
                    className="w-24 h-24 rounded-full mx-auto border border-white/20 mb-6"
                />
                <h1 className="text-4xl font-serif mb-2 text-white">{agent.fullName}</h1>
                <p className="text-[#D4AF37] italic font-serif text-lg">{agent.title}</p>
                <div className="w-12 h-[1px] bg-[#D4AF37] mx-auto my-6"></div>
                <p className="text-white/80 uppercase tracking-widest text-sm">{agent.company}</p>
            </div>

            <a
                href={`tel:${agent.phone}`}
                className="inline-block border border-[#D4AF37] text-[#D4AF37] px-8 py-3 uppercase tracking-widest text-xs hover:bg-[#D4AF37] hover:text-black transition-colors duration-500"
            >
                Contact Agent
            </a>
        </div>
    );
}
