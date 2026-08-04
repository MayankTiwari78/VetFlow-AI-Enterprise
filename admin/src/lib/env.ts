export const publicEnv = {
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000",
  currency: process.env.NEXT_PUBLIC_CURRENCY ?? "INR"
} as const;
