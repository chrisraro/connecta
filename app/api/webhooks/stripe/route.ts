import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";

/**
 * Stripe Webhook Handler
 * 
 * Receives events from Stripe when payment status changes.
 * Updates order status in Convex accordingly.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe signature" }, { status: 400 });
  }

  try {
    // Verify webhook signature (in production, use actual Stripe webhook secret)
    // const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    // const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    // For now, parse the event directly
    const event = JSON.parse(body);

    console.log("Stripe webhook received:", event.type);

    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        console.log("Payment succeeded:", paymentIntent.id);
        
        // TODO: Update order in Convex
        // await convex.mutation("checkout:confirmPayment", {
        //   paymentIntentId: paymentIntent.id,
        //   paymentStatus: "paid",
        // });
        
        break;

      case "payment_intent.payment_failed":
        const failedIntent = event.data.object;
        console.log("Payment failed:", failedIntent.id);
        
        // TODO: Update order in Convex
        // await convex.mutation("checkout:confirmPayment", {
        //   paymentIntentId: failedIntent.id,
        //   paymentStatus: "failed",
        // });
        
        break;

      case "charge.refunded":
        const charge = event.data.object;
        console.log("Charge refunded:", charge.id);
        
        // TODO: Update order in Convex
        // await convex.mutation("checkout:confirmPayment", {
        //   paymentIntentId: charge.payment_intent,
        //   paymentStatus: "refunded",
        // });
        
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
