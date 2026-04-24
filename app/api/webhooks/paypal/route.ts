import { NextRequest, NextResponse } from "next/server";

/**
 * PayPal Webhook Handler
 * 
 * Receives events from PayPal when payment status changes.
 * Updates order status in Convex accordingly.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const eventType = body.event_type;

  console.log("PayPal webhook received:", eventType);

  try {
    switch (eventType) {
      case "PAYMENT.CAPTURE.COMPLETED":
        const completedPayment = body.resource;
        console.log("PayPal payment completed:", completedPayment.id);
        
        // TODO: Update order in Convex
        // await convex.mutation("checkout:confirmPayment", {
        //   paymentIntentId: completedPayment.id,
        //   paymentStatus: "paid",
        // });
        
        break;

      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.FAILED":
        const failedPayment = body.resource;
        console.log("PayPal payment failed:", failedPayment.id);
        
        // TODO: Update order in Convex
        // await convex.mutation("checkout:confirmPayment", {
        //   paymentIntentId: failedPayment.id,
        //   paymentStatus: "failed",
        // });
        
        break;

      case "PAYMENT.CAPTURE.REFUNDED":
        const refundedPayment = body.resource;
        console.log("PayPal payment refunded:", refundedPayment.id);
        
        // TODO: Update order in Convex
        // await convex.mutation("checkout:confirmPayment", {
        //   paymentIntentId: refundedPayment.id,
        //   paymentStatus: "refunded",
        // });
        
        break;

      default:
        console.log(`Unhandled PayPal event type: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayPal webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
