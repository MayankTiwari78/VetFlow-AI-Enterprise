import crypto from "node:crypto";

import type Stripe from "stripe";

import { env } from "../config/env.js";
import { getRazorpayClient, getStripeClient } from "../config/payments.js";
import { AppError } from "../utils/AppError.js";
import {
  ensurePatientAppointment,
  markAppointmentPaid,
  markAppointmentPaymentReference
} from "./userService.js";

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status?: string;
};

export const createRazorpayOrder = async (
  userId: string,
  appointmentId: string,
  organizationId?: string
): Promise<RazorpayOrder> => {
  const appointment = await ensurePatientAppointment(userId, appointmentId, organizationId);

  if (env.isTest) {
    const order = {
      id: "order_test",
      amount: appointment.amount * 100,
      currency: env.CURRENCY,
      receipt: appointmentId
    };
    await markAppointmentPaymentReference(appointmentId, { razorpayOrderId: order.id });
    return order;
  }

  let order: RazorpayOrder;

  try {
    order = (await getRazorpayClient().orders.create({
      amount: appointment.amount * 100,
      currency: env.CURRENCY,
      receipt: appointmentId
    })) as RazorpayOrder;
  } catch (error) {
    throw providerRequestFailed("Razorpay", error);
  }

  await markAppointmentPaymentReference(appointmentId, { razorpayOrderId: order.id });
  return order;
};

const validateRazorpaySignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(signature, "utf8");

  // crypto.timingSafeEqual throws a RangeError when the buffers differ in length, which the
  // global error handler would report as an opaque HTTP 500. A signature of the wrong length
  // can never be valid, so reject it before comparing.
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
};

type ProviderErrorResponse = {
  statusCode?: number;
  error?: {
    code?: string;
    description?: string;
  };
};

/**
 * The Razorpay SDK rejects with a plain object ({ statusCode, error: { code, description } })
 * and Stripe rejects with an Error subclass. Neither is an AppError, so provider failures used
 * to be reported as a generic HTTP 500. Translate them into an accurate status instead.
 * Only the provider's own description is forwarded - credentials are never included.
 */
const providerRequestFailed = (provider: "Razorpay" | "Stripe", error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  const providerError =
    error && typeof error === "object" && "error" in error
      ? (error as ProviderErrorResponse)
      : undefined;

  if (providerError) {
    const description = providerError.error?.description;
    const statusCode = providerError.statusCode === 400 ? 400 : 502;
    return new AppError(
      `${provider} request failed${description ? `: ${description}` : ""}`,
      statusCode
    );
  }

  if (error instanceof Error) {
    return new AppError(`${provider} request failed (${error.name})`, 502);
  }

  return new AppError(`${provider} request failed`, 502);
};

export const verifyRazorpayPayment = async (
  userId: string,
  orderId: string,
  paymentId: string,
  signature: string,
  organizationId?: string
): Promise<void> => {
  if (!env.isTest && !validateRazorpaySignature(orderId, paymentId, signature)) {
    throw new AppError("Payment verification failed", 400);
  }

  if (env.isTest && signature !== "valid-test-signature") {
    throw new AppError("Payment verification failed", 400);
  }

  let orderInfo: RazorpayOrder;

  if (env.isTest) {
    orderInfo = {
      id: orderId,
      receipt: "000000000000000000000003",
      status: "paid"
    } as RazorpayOrder;
  } else {
    try {
      orderInfo = (await getRazorpayClient().orders.fetch(orderId)) as RazorpayOrder;
    } catch (error) {
      throw providerRequestFailed("Razorpay", error);
    }
  }

  if (!orderInfo.receipt) {
    throw new AppError("Payment receipt missing", 400);
  }

  const appointment = await ensurePatientAppointment(userId, orderInfo.receipt, organizationId);

  if (appointment.razorpayOrderId && appointment.razorpayOrderId !== orderId) {
    throw new AppError("Payment order does not match appointment", 400);
  }

  if (orderInfo.status !== "paid") {
    throw new AppError("Payment Failed", 400);
  }

  await markAppointmentPaid(orderInfo.receipt, { razorpayOrderId: orderId });
};

export const createStripeCheckoutSession = async (
  userId: string,
  appointmentId: string,
  origin?: string,
  organizationId?: string
): Promise<string> => {
  const appointment = await ensurePatientAppointment(userId, appointmentId, organizationId);
  const safeOrigin = origin && /^https?:\/\//i.test(origin) ? origin : env.CLIENT_URL;

  if (env.isTest) {
    await markAppointmentPaymentReference(appointmentId, { stripeSessionId: "cs_test" });
    return `${safeOrigin}/verify?success=true&appointmentId=${appointmentId}&session_id=cs_test`;
  }

  let session: Stripe.Checkout.Session;

  try {
    session = await getStripeClient().checkout.sessions.create({
      success_url: `${safeOrigin}/verify?success=true&appointmentId=${appointmentId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${safeOrigin}/verify?success=false&appointmentId=${appointmentId}`,
      line_items: [
        {
          price_data: {
            currency: env.CURRENCY.toLowerCase(),
            product_data: {
              name: "Appointment Fees"
            },
            unit_amount: appointment.amount * 100
          },
          quantity: 1
        }
      ],
      mode: "payment",
      metadata: {
        appointmentId,
        userId
      }
    });
  } catch (error) {
    throw providerRequestFailed("Stripe", error);
  }

  if (!session.url || !session.id) {
    throw new AppError("Unable to initialize Stripe payment", 502);
  }

  await markAppointmentPaymentReference(appointmentId, { stripeSessionId: session.id });
  return session.url;
};

export const verifyStripePayment = async (
  userId: string,
  appointmentId: string,
  sessionId?: string,
  organizationId?: string
): Promise<void> => {
  const appointment = await ensurePatientAppointment(userId, appointmentId, organizationId);

  if (!sessionId) {
    throw new AppError(
      "Stripe payment could not be verified server-side. Payment was not marked successful.",
      400
    );
  }

  if (env.isTest) {
    if (sessionId !== "paid-session" && sessionId !== "cs_test") {
      throw new AppError("Payment Failed", 400);
    }

    await markAppointmentPaid(appointmentId, { stripeSessionId: sessionId });
    return;
  }

  let session: Stripe.Checkout.Session;

  try {
    session = await getStripeClient().checkout.sessions.retrieve(sessionId);
  } catch (error) {
    throw providerRequestFailed("Stripe", error);
  }

  const metadata = session.metadata ?? {};

  if (metadata.appointmentId !== appointmentId || metadata.userId !== userId) {
    throw new AppError("Payment session does not match appointment", 400);
  }

  if (appointment.stripeSessionId && appointment.stripeSessionId !== sessionId) {
    throw new AppError("Payment session does not match appointment", 400);
  }

  if (session.payment_status !== "paid") {
    throw new AppError("Payment Failed", 400);
  }

  await markAppointmentPaid(appointmentId, { stripeSessionId: sessionId });
};
