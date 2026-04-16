"use client";

import { TemplateProps } from "@/types/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function ContactForm({ data }: TemplateProps) {
    const { theme, ownerId } = data;
    const createLead = useMutation(api.leads.createLead);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        message: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await createLead({
                ownerId: ownerId as Id<"users">,
                inquirerName: form.name,
                inquirerContact: form.email || form.phone, // fallback if email is not provided
                message: form.message + (form.phone ? `\n\nPhone: ${form.phone}` : ""),
            });
            setIsSuccess(true);
            setForm({ name: "", phone: "", email: "", message: "" });
            
            setTimeout(() => {
                setIsSuccess(false);
            }, 5000);
        } catch (error) {
            console.error(error);
            alert("Failed to send message. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="px-4 py-12 max-w-xl mx-auto text-center">
            <h2
                className="text-2xl font-bold mb-2"
                style={{ color: theme.textColor }}
            >
                Get In Touch
            </h2>
            <p className="mb-8 opacity-70" style={{ color: theme.textColor }}>
                Interested in learning more or working together?
            </p>

            <form className="space-y-4 text-left" onSubmit={handleSubmit}>
                <Input 
                    required
                    value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    placeholder="Your Name" 
                    className="bg-white/5 border-white/20" 
                />
                <Input 
                    value={form.phone}
                    onChange={(e) => setForm({...form, phone: e.target.value})}
                    placeholder="Phone Number" 
                    className="bg-white/5 border-white/20" 
                    type="tel" 
                />
                <Input 
                    required
                    value={form.email}
                    onChange={(e) => setForm({...form, email: e.target.value})}
                    placeholder="Email Address" 
                    className="bg-white/5 border-white/20" 
                    type="email" 
                />
                <Textarea 
                    required
                    value={form.message}
                    onChange={(e) => setForm({...form, message: e.target.value})}
                    placeholder="How can I help you?" 
                    className="bg-white/5 border-white/20 min-h-[120px]" 
                />

                <Button
                    disabled={isSubmitting || isSuccess}
                    className="w-full font-bold h-12 text-lg transition-all"
                    style={{ 
                        backgroundColor: isSuccess ? "#22c55e" : theme.primaryColor, 
                        color: isSuccess ? "#fff" : theme.backgroundColor 
                    }}
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isSuccess ? (
                        <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Message Sent</span>
                    ) : (
                        "Send Message"
                    )}
                </Button>
            </form>
        </div>
    );
}
