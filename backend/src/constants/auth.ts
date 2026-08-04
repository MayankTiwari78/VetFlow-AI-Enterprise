export const ACCOUNT_TYPES = ["patient", "doctor", "admin"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_STATUSES = [
  "PENDING_VERIFICATION",
  "ACTIVE",
  "SUSPENDED",
  "DISABLED"
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const AUTHENTICATION_PROVIDERS = ["LOCAL"] as const;
export type AuthenticationProvider = (typeof AUTHENTICATION_PROVIDERS)[number];

export const AUTH_CHALLENGE_PURPOSES = [
  "EMAIL_VERIFICATION",
  "PASSWORD_RESET",
  "LOGIN_VERIFICATION"
] as const;
export type AuthChallengePurpose = (typeof AUTH_CHALLENGE_PURPOSES)[number];

export const GENERIC_AUTH_ERROR = "Invalid email or password";
export const GENERIC_RECOVERY_RESPONSE =
  "If an account exists for that email, instructions will be sent shortly";

export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 12 characters and include uppercase, lowercase, number, and symbol";
