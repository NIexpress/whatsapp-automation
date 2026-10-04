import Razorpay from "razorpay";
import crypto from "crypto";

export const getRazorpayKeys = () => {
  const keyId =
    process.env.RAZORPAY_KEY_ID ||
    process.env.PAYMENT_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    "";
  const keySecret =
    process.env.RAZORPAY_KEY_SECRET ||
    process.env.PAYMENT_KEY_SECRET ||
    "";

  if (!keyId || !keySecret) {
    console.warn("[Razorpay] Warning: Razorpay Key ID or Secret is not configured in environment variables.");
  }

  return { keyId, keySecret };
};

export const getRazorpayClient = () => {
  const { keyId, keySecret } = getRazorpayKeys();
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

export interface CreateOrderParams {
  amountInRupees: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string | number>;
}

export async function createRazorpayOrder(params: CreateOrderParams) {
  const client = getRazorpayClient();
  const amountInPaise = Math.round(params.amountInRupees * 100);

  const order = await client.orders.create({
    amount: amountInPaise,
    currency: params.currency || "INR",
    receipt: params.receipt,
    notes: params.notes,
  });

  return order;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export function verifyRazorpaySignature(params: VerifyPaymentParams): boolean {
  const { keySecret } = getRazorpayKeys();
  if (!keySecret) {
    throw new Error("Razorpay key secret is not configured.");
  }

  const generatedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  const signatureBuffer = Buffer.from(params.signature);
  const expectedBuffer = Buffer.from(generatedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

export function verifyWebhookSignature(rawBody: string, webhookSignature: string): boolean {
  const webhookSecret =
    process.env.RAZORPAY_WEBHOOK_SECRET ||
    process.env.PAYMENT_WEBHOOK_SECRET ||
    "";

  if (!webhookSecret) {
    throw new Error("Razorpay webhook secret is not configured.");
  }

  const generatedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const signatureBuffer = Buffer.from(webhookSignature);
  const expectedBuffer = Buffer.from(generatedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}
