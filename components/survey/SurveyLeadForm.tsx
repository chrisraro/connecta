"use client";

import { useId, useState } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useCreateLead } from "@/hooks/useLeads";
import type { ProfileCopy } from "./copy";
import styles from "./survey.module.css";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * "Leave your details": the lead capture at the foot of a public profile.
 * Posts to /api/leads through useCreateLead, exactly like the template
 * ContactSection did, so rate limiting, the owner notification and the email
 * are unchanged. Contact accepts an email or a mobile number, because most
 * people in the room will hand over a number.
 */
export function SurveyLeadForm({
  ownerId,
  firstName,
  t,
}: {
  ownerId: string;
  firstName: string;
  t: ProfileCopy;
}) {
  const createLead = useCreateLead();
  const [status, setStatus] = useState<Status>("idle");
  const [form, setForm] = useState({ name: "", contact: "", message: "" });

  const uid = useId();
  const ids = {
    name: `${uid}-name`,
    contact: `${uid}-contact`,
    message: `${uid}-message`,
    status: `${uid}-status`,
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      await createLead.mutateAsync({
        owner_id: ownerId,
        inquirer_name: form.name.trim(),
        inquirer_contact: form.contact.trim(),
        message: form.message.trim() || undefined,
      });
      setStatus("sent");
      setForm({ name: "", contact: "", message: "" });
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div
        role="status"
        className="flex items-start gap-3 border-[1.5px] p-5"
        style={{ borderColor: "var(--sv-line)" }}
      >
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center"
          style={{ backgroundColor: "var(--sv-action-bg)", color: "var(--sv-action-ink)" }}
        >
          <Check className="h-4 w-4" strokeWidth={2} />
        </span>
        <p className="text-[17px] font-semibold leading-snug">{t.sent(firstName)}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor={ids.name} className="text-[15px] font-semibold">
          {t.yourName}
        </label>
        <input
          id={ids.name}
          required
          autoComplete="name"
          maxLength={120}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={styles.field}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={ids.contact} className="text-[15px] font-semibold">
          {t.yourContact}
        </label>
        <input
          id={ids.contact}
          required
          inputMode="email"
          autoComplete="email"
          maxLength={200}
          value={form.contact}
          onChange={(e) => setForm({ ...form, contact: e.target.value })}
          className={styles.field}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={ids.message} className="text-[15px] font-semibold">
          {t.message}{" "}
          <span className="font-normal" style={{ color: "var(--sv-soft)" }}>
            ({t.optional})
          </span>
        </label>
        <textarea
          id={ids.message}
          rows={4}
          maxLength={2000}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className={`${styles.field} resize-none`}
        />
      </div>

      {status === "error" && (
        <p
          id={ids.status}
          role="alert"
          className="flex items-center gap-2 text-[15px] font-semibold"
          style={{ color: "var(--sv-mark-text)" }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t.sendError}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        aria-describedby={status === "error" ? ids.status : undefined}
        className={`${styles.primary} ${styles.semiExpanded} flex h-14 w-full items-center justify-center gap-2 text-[16px] font-bold`}
      >
        {status === "sending" ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            {t.sending}
          </>
        ) : (
          t.send
        )}
      </button>
    </form>
  );
}
