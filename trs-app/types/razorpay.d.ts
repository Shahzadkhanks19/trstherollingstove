export {};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }

  interface RazorpayCheckoutInstance {
    open(): void;
    on(event: "payment.failed", handler: (response: RazorpayFailureResponse) => void): void;
  }

  interface RazorpayCheckoutOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    image?: string;
    prefill?: { name?: string; email?: string; contact?: string };
    theme?: { color?: string };
    modal?: { ondismiss?: () => void; escape?: boolean; backdropclose?: boolean };
    handler(response: RazorpaySuccessResponse): void | Promise<void>;
  }

  interface RazorpaySuccessResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  interface RazorpayFailureResponse {
    error?: {
      code?: string;
      description?: string;
      reason?: string;
      metadata?: { order_id?: string; payment_id?: string };
    };
  }
}
