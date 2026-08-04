const fallbackBackendUrl = "http://localhost:4000";

export const publicEnv = {
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL ?? fallbackBackendUrl,
  razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "rzp_test_placeholder"
} as const;
