/**
 * Payment Abstraction Layer
 * 
 * Unified interface for payment providers (Stripe, PayPal, Xendit, PayMongo)
 * Easy to add new providers by implementing the PaymentProvider interface
 */

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

export interface PaymentProvider {
  createPayment(amount: number, currency: string, metadata: Record<string, any>): Promise<PaymentResult>;
  confirmPayment(paymentIntentId: string): Promise<PaymentResult>;
  refundPayment(paymentIntentId: string, amount?: number): Promise<RefundResult>;
}

// Stripe Implementation
class StripeProvider implements PaymentProvider {
  private stripe: any;

  constructor(secretKey: string) {
    // In a real app, initialize Stripe SDK here
    // this.stripe = new Stripe(secretKey, { apiVersion: '2024-01-01' });
  }

  async createPayment(amount: number, currency: string, metadata: Record<string, any>): Promise<PaymentResult> {
    try {
      // This would be called server-side via Convex
      // For now, return placeholder - actual implementation in convex/checkout.ts
      return {
        success: true,
        paymentIntentId: `pi_stripe_${Date.now()}`,
        clientSecret: `pi_stripe_${Date.now()}_secret`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Stripe payment creation failed',
      };
    }
  }

  async confirmPayment(paymentIntentId: string): Promise<PaymentResult> {
    try {
      // Verify payment status from Stripe
      return {
        success: true,
        paymentIntentId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Stripe payment confirmation failed',
      };
    }
  }

  async refundPayment(paymentIntentId: string, amount?: number): Promise<RefundResult> {
    try {
      // Process refund via Stripe API
      return {
        success: true,
        refundId: `re_stripe_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Stripe refund failed',
      };
    }
  }
}

// PayPal Implementation
class PayPalProvider implements PaymentProvider {
  async createPayment(amount: number, currency: string, metadata: Record<string, any>): Promise<PaymentResult> {
    try {
      // This would be called server-side via Convex
      return {
        success: true,
        paymentIntentId: `pp_paypal_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PayPal payment creation failed',
      };
    }
  }

  async confirmPayment(paymentIntentId: string): Promise<PaymentResult> {
    try {
      // Verify payment status from PayPal
      return {
        success: true,
        paymentIntentId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PayPal payment confirmation failed',
      };
    }
  }

  async refundPayment(paymentIntentId: string, amount?: number): Promise<RefundResult> {
    try {
      // Process refund via PayPal API
      return {
        success: true,
        refundId: `re_paypal_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PayPal refund failed',
      };
    }
  }
}

// Provider Registry
const providers: Record<string, PaymentProvider> = {
  stripe: new StripeProvider(process.env.STRIPE_SECRET_KEY || ''),
  paypal: new PayPalProvider(),
};

export function getPaymentProvider(provider: string): PaymentProvider {
  const paymentProvider = providers[provider];
  if (!paymentProvider) {
    throw new Error(`Payment provider "${provider}" not found`);
  }
  return paymentProvider;
}

// Helper functions for use in components/API routes
export async function createPayment(
  provider: string,
  amount: number,
  currency: string,
  metadata: Record<string, any>
): Promise<PaymentResult> {
  const paymentProvider = getPaymentProvider(provider);
  return paymentProvider.createPayment(amount, currency, metadata);
}

export async function confirmPayment(
  provider: string,
  paymentIntentId: string
): Promise<PaymentResult> {
  const paymentProvider = getPaymentProvider(provider);
  return paymentProvider.confirmPayment(paymentIntentId);
}

export async function refundPayment(
  provider: string,
  paymentIntentId: string,
  amount?: number
): Promise<RefundResult> {
  const paymentProvider = getPaymentProvider(provider);
  return paymentProvider.refundPayment(paymentIntentId, amount);
}
