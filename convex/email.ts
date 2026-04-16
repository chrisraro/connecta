"use node";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { Resend } from "resend";

export const sendLeadNotification = internalAction({
    args: {
        toEmail: v.string(),
        inquirerName: v.string(),
        inquirerContact: v.string(),
        propertyName: v.optional(v.string()),
        message: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // NOTE: Make sure to add RESEND_API_KEY in the Convex Dashboard -> Settings -> Environment Variables
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) {
            console.warn("RESEND_API_KEY is not configured. Email not sent.");
            return;
        }

        const resend = new Resend(resendKey);
        
        const propertyText = args.propertyName ? `regarding ${args.propertyName}` : "from your profile";

        await resend.emails.send({
            from: "Tapfolio <onboarding@resend.dev>", // Resend testing domain
            to: args.toEmail,
            subject: `New Lead ${propertyText} - ${args.inquirerName}`,
            html: `
                <h2>You have a new inquiry!</h2>
                <p><strong>Name:</strong> ${args.inquirerName}</p>
                <p><strong>Contact:</strong> ${args.inquirerContact}</p>
                ${args.propertyName ? `<p><strong>Interest:</strong> ${args.propertyName}</p>` : ""}
                <p><strong>Message:</strong><br/>${args.message || "No message provided."}</p>
                
                <br/>
                <p>Log in to your Tapfolio dashboard to reply.</p>
            `,
        });
    },
});
