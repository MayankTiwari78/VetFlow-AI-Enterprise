import Razorpay from "razorpay";
import Stripe from "stripe";

import { env } from "./env.js";

let stripeClient: Stripe | undefined;
let razorpayClient: Razorpay | undefined;

export const getStripeClient = (): Stripe => {
  stripeClient ??= new Stripe(env.STRIPE_SECRET_KEY);
  return stripeClient;
};

export const getRazorpayClient = (): Razorpay => {
  razorpayClient ??= new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET
  });
  return razorpayClient;
};
