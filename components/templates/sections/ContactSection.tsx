"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Loader2, CheckCircle2, Send } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { readableTextColor } from "@/lib/utils";
import { TemplateTheme } from "../theme";
import { SectionShell } from "./SectionShell";

export function ContactSection({ theme, index, ownerId }: { theme: TemplateTheme; index: number; ownerId: string }) {
  const createLead = useMutation(api.leads.createLead);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createLead({
        ownerId: ownerId as Id<"users">,
        inquirerName: form.name,
        inquirerContact: form.email,
        message: form.message,
      });
      setIsSuccess(true);
      setForm({ name: "", email: "", message: "" });
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      console.error(error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldStyle = { backgroundColor: theme.colors.background, color: theme.colors.ink };

  return (
    <SectionShell theme={theme} index={index} heading="Get In Touch" surface>
      <p className="text-sm mb-8 -mt-3" style={{ color: theme.colors.inkSoft }}>
        I&apos;m always interested in hearing about new projects and opportunities.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-xs mb-2 block font-medium" style={{ color: theme.colors.inkSoft }}>Name</label>
          <Input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Your name"
            className="h-12 border-0 rounded-[var(--r-sm)]"
            style={fieldStyle}
          />
        </div>
        <div>
          <label className="text-xs mb-2 block font-medium" style={{ color: theme.colors.inkSoft }}>Email</label>
          <Input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="your@email.com"
            className="h-12 border-0 rounded-[var(--r-sm)]"
            style={fieldStyle}
          />
        </div>
        <div>
          <label className="text-xs mb-2 block font-medium" style={{ color: theme.colors.inkSoft }}>Message</label>
          <Textarea
            required
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Tell me about your project..."
            className="min-h-[120px] resize-none border-0 rounded-[var(--r-sm)]"
            style={fieldStyle}
          />
        </div>
        <Button
          type="submit"
          disabled={isSubmitting || isSuccess}
          className="w-full h-12 font-medium border-0 rounded-[var(--r-sm)]"
          style={{
            backgroundColor: isSuccess ? "#22c55e" : theme.colors.accent,
            color: isSuccess ? "#ffffff" : readableTextColor(theme.colors.accent),
          }}
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isSuccess ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Message Sent
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Send className="w-4 h-4" /> Send Message
            </span>
          )}
        </Button>
      </form>
    </SectionShell>
  );
}
