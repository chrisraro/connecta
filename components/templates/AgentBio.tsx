import { TemplateProps } from "@/types/profile";

export default function AgentBio({ data }: TemplateProps) {
    const { agent, theme } = data;

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h2
                className="text-xl font-bold mb-4"
                style={{ color: theme.textColor }}
            >
                About Me
            </h2>
            <p
                className="leading-relaxed opacity-90"
                style={{ color: theme.textColor }}
            >
                {agent.about || `Drawing from years of experience in the ${agent.company} market, I specialize in connecting clients with their dream properties. My approach is built on transparency, dedication, and a deep understanding of market trends. Whether you are buying your first home or seeking a luxury investment, I am here to guide you every step of the way.`}
            </p>
        </div>
    );
}
