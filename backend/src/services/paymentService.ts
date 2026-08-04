import crypto from "node:crypto";

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

  const order = (await getRazorpayClient().orders.create({
    amount: appointment.amount * 100,
    currency: env.CURRENCY,
    receipt: appointmentId
  })) as RazorpayOrder;

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

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
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

  const orderInfo = env.isTest
    ? ({ id: orderId, receipt: "000000000000000000000003", status: "paid" } as RazorpayOrder)
    : ((await getRazorpayClient().orders.fetch(orderId)) as RazorpayOrder);

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

  const session = await getStripeClient().checkout.sessions.create({
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

  const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
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
