import { TemplateProps } from "@/types/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ContactForm({ data }: TemplateProps) {
    const { theme } = data;

    return (
        <div className="px-4 py-12 max-w-xl mx-auto text-center">
            <h2
                className="text-2xl font-bold mb-2"
                style={{ color: theme.textColor }}
            >
                Get In Touch
            </h2>
            <p className="mb-8 opacity-70" style={{ color: theme.textColor }}>
                Interested in viewing a property or selling yours?
            </p>

            <form className="space-y-4 text-left">
                <Input placeholder="Your Name" className="bg-white/5 border-white/20" />
                <Input placeholder="Phone Number" className="bg-white/5 border-white/20" type="tel" />
                <Input placeholder="Email Address" className="bg-white/5 border-white/20" type="email" />
                <Textarea placeholder="How can I help you?" className="bg-white/5 border-white/20 min-h-[120px]" />

                <Button
                    className="w-full font-bold h-12 text-lg"
                    style={{ backgroundColor: theme.primaryColor, color: theme.backgroundColor }}
                >
                    Send Message
                </Button>
            </form>
        </div>
    );
}
