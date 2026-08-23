import Razorpay from "razorpay";

import { AppError } from "@/lib/errors/AppError";

let instance: Razorpay | null = null;

export function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new AppError("Razorpay credentials are not configured.", 500);
  }

  if (!instance) {
    instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return instance;
}

export function getRazorpayPublicKey() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) {
    throw new AppError("Razorpay public key is not configured.", 500);
  }
  return keyId;
}
