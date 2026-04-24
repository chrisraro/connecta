"use node";
import { v } from "convex/values";
import { internalAction, action } from "./_generated/server";
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

// Send order confirmation email (for guest checkout)
export const sendOrderConfirmation = internalAction({
    args: {
        toEmail: v.string(),
        orderNumber: v.string(),
        orderTotal: v.number(),
        currency: v.string(),
        items: v.array(v.object({
            productName: v.string(),
            variationName: v.optional(v.string()),
            quantity: v.number(),
            unitPrice: v.number(),
            total: v.number(),
        })),
        shippingAddress: v.object({
            fullName: v.string(),
            addressLine1: v.string(),
            addressLine2: v.optional(v.string()),
            city: v.string(),
            state: v.optional(v.string()),
            postalCode: v.string(),
            country: v.string(),
            phone: v.string(),
        }),
        subtotal: v.number(),
        tax: v.number(),
        shipping: v.number(),
    },
    handler: async (ctx, args) => {
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) {
            console.warn("RESEND_API_KEY is not configured. Email not sent.");
            return { success: false, error: "Email not configured" };
        }

        const resend = new Resend(resendKey);

        const formatPrice = (cents: number, currency: string) => {
            return `${currency.toUpperCase()} ${(cents / 100).toFixed(2)}`;
        };

        try {
            await resend.emails.send({
                from: "Tapfolio Shop <orders@resend.dev>",
                to: args.toEmail,
                subject: `Order Confirmation - ${args.orderNumber}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #333;">Thank you for your order!</h1>
                        <p style="color: #666;">Your order has been confirmed and is being processed.</p>
                        
                        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h2 style="color: #333; margin-top: 0;">Order Details</h2>
                            <p><strong>Order Number:</strong> ${args.orderNumber}</p>
                            <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>

                        <div style="margin: 20px 0;">
                            <h2 style="color: #333;">Order Items</h2>
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #f5f5f5;">
                                        <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Item</th>
                                        <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">Qty</th>
                                        <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${args.items.map(item => `
                                        <tr>
                                            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                                <strong>${item.productName}</strong>
                                                ${item.variationName ? `<br/><span style="color: #666; font-size: 12px;">${item.variationName}</span>` : ''}
                                            </td>
                                            <td style="padding: 10px; text-align: center; border-bottom: 1px solid #eee;">${item.quantity}</td>
                                            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${formatPrice(item.total, args.currency)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>

                        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #333; margin-top: 0;">Shipping Address</h3>
                            <p style="margin: 5px 0;">${args.shippingAddress.fullName}</p>
                            <p style="margin: 5px 0;">${args.shippingAddress.addressLine1}</p>
                            ${args.shippingAddress.addressLine2 ? `<p style="margin: 5px 0;">${args.shippingAddress.addressLine2}</p>` : ''}
                            <p style="margin: 5px 0;">${args.shippingAddress.city}${args.shippingAddress.state ? ', ' + args.shippingAddress.state : ''} ${args.shippingAddress.postalCode}</p>
                            <p style="margin: 5px 0;">${args.shippingAddress.country}</p>
                            <p style="margin: 5px 0;">${args.shippingAddress.phone}</p>
                        </div>

                        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #333; margin-top: 0;">Order Summary</h3>
                            <table style="width: 100%;">
                                <tr>
                                    <td style="padding: 5px 0;">Subtotal</td>
                                    <td style="padding: 5px 0; text-align: right;">${formatPrice(args.subtotal, args.currency)}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0;">Shipping</td>
                                    <td style="padding: 5px 0; text-align: right;">${formatPrice(args.shipping, args.currency)}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0;">Tax</td>
                                    <td style="padding: 5px 0; text-align: right;">${formatPrice(args.tax, args.currency)}</td>
                                </tr>
                                <tr style="border-top: 2px solid #333;">
                                    <td style="padding: 10px 0;"><strong>Total</strong></td>
                                    <td style="padding: 10px 0; text-align: right;"><strong>${formatPrice(args.orderTotal, args.currency)}</strong></td>
                                </tr>
                            </table>
                        </div>

                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
                            <p>If you have any questions about your order, please contact us at support@tapfolio.com</p>
                            <p>© ${new Date().getFullYear()} Tapfolio. All rights reserved.</p>
                        </div>
                    </div>
                `,
            });

            return { success: true };
        } catch (error) {
            console.error("Failed to send order confirmation:", error);
            return { success: false, error: "Failed to send email" };
        }
    },
});
