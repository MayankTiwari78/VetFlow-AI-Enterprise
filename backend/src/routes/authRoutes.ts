import { Router } from "express";

import {
  forgotPasswordRequest,
  loginAdmin,
  loginDoctor,
  loginUser,
  logout,
  logoutAll,
  refreshToken,
  registerUser,
  requestOtpChallenge,
  resendVerificationEmail,
  resetPasswordRequest,
  unifiedLogin,
  verifyTwoFactorLoginRequest,
  verifyEmail,
  verifyEmailLink,
  verifyOtpChallenge
} from "../controllers/authController.js";
import {
  beginSetup,
  confirmSetup,
  disableSetup,
  regenerateCodes,
  twoFactorStatus
} from "../controllers/securityController.js";
import {
  listSessions,
  pruneSessions,
  renameSession,
  revokeAllSessions,
  revokeOtherSessions,
  revokeSession
} from "../controllers/sessionController.js";
import { authAny, authorizePermissions } from "../middleware/auth.js";
import {
  authRateLimiter,
  csrfOriginProtection,
  otpRateLimiter,
  passwordResetRateLimiter,
  refreshRateLimiter,
  registrationRateLimiter,
  verificationRateLimiter
} from "../middleware/security.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  adminLoginSchema,
  emptyBodySchema,
  forgotPasswordSchema,
  loginSchema,
  registerUserSchema,
  requestOtpSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  unifiedLoginSchema,
  verifyEmailSchema,
  verifyOtpSchema
} from "../validators/authValidators.js";
import {
  confirmTwoFactorSetupSchema,
  disableTwoFactorSchema,
  regenerateRecoveryCodesSchema,
  renameSessionSchema,
  sessionIdParamSchema,
  verifyTwoFactorLoginSchema
} from "../validators/authorizationValidators.js";

const authRouter = Router();

authRouter.post(
  "/register",
  registrationRateLimiter,
  validateRequest({ body: registerUserSchema }),
  registerUser
);
authRouter.post(
  "/login",
  authRateLimiter,
  validateRequest({ body: unifiedLoginSchema }),
  unifiedLogin
);
authRouter.post(
  "/patient/login",
  authRateLimiter,
  validateRequest({ body: loginSchema }),
  loginUser
);
authRouter.post(
  "/doctor/login",
  authRateLimiter,
  validateRequest({ body: loginSchema }),
  loginDoctor
);
authRouter.post(
  "/admin/login",
  authRateLimiter,
  validateRequest({ body: adminLoginSchema }),
  loginAdmin
);
authRouter.post(
  "/2fa/login/verify",
  otpRateLimiter,
  validateRequest({ body: verifyTwoFactorLoginSchema }),
  verifyTwoFactorLoginRequest
);
authRouter.post(
  "/refresh",
  refreshRateLimiter,
  csrfOriginProtection,
  validateRequest({ body: emptyBodySchema }),
  refreshToken
);
authRouter.post(
  "/logout",
  csrfOriginProtection,
  validateRequest({ body: emptyBodySchema }),
  logout
);
authRouter.post(
  "/logout-all",
  csrfOriginProtection,
  authAny,
  validateRequest({ body: emptyBodySchema }),
  logoutAll
);
authRouter.post(
  "/verify-email",
  verificationRateLimiter,
  validateRequest({ body: verifyEmailSchema }),
  verifyEmail
);
authRouter.get("/verify-email", verificationRateLimiter, verifyEmailLink);
authRouter.post(
  "/resend-verification",
  verificationRateLimiter,
  validateRequest({ body: resendVerificationSchema }),
  resendVerificationEmail
);
authRouter.post(
  "/forgot-password",
  passwordResetRateLimiter,
  validateRequest({ body: forgotPasswordSchema }),
  forgotPasswordRequest
);
authRouter.post(
  "/reset-password",
  passwordResetRateLimiter,
  validateRequest({ body: resetPasswordSchema }),
  resetPasswordRequest
);
authRouter.post(
  "/otp/request",
  otpRateLimiter,
  validateRequest({ body: requestOtpSchema }),
  requestOtpChallenge
);
authRouter.post(
  "/otp/verify",
  otpRateLimiter,
  validateRequest({ body: verifyOtpSchema }),
  verifyOtpChallenge
);

authRouter.get("/2fa/status", authAny, twoFactorStatus);
authRouter.post("/2fa/setup/begin", otpRateLimiter, csrfOriginProtection, authAny, beginSetup);
authRouter.post(
  "/2fa/setup/confirm",
  otpRateLimiter,
  csrfOriginProtection,
  authAny,
  validateRequest({ body: confirmTwoFactorSetupSchema }),
  confirmSetup
);
authRouter.post(
  "/2fa/disable",
  otpRateLimiter,
  csrfOriginProtection,
  authAny,
  validateRequest({ body: disableTwoFactorSchema }),
  disableSetup
);
authRouter.post(
  "/2fa/recovery-codes/regenerate",
  otpRateLimiter,
  csrfOriginProtection,
  authAny,
  validateRequest({ body: regenerateRecoveryCodesSchema }),
  regenerateCodes
);

authRouter.get("/sessions", authAny, authorizePermissions("sessions:read"), listSessions);
authRouter.post(
  "/sessions/revoke-others",
  csrfOriginProtection,
  authAny,
  authorizePermissions("sessions:manage"),
  validateRequest({ body: emptyBodySchema }),
  revokeOtherSessions
);
authRouter.post(
  "/sessions/revoke-all",
  csrfOriginProtection,
  authAny,
  authorizePermissions("sessions:manage"),
  validateRequest({ body: emptyBodySchema }),
  revokeAllSessions
);
authRouter.post(
  "/sessions/prune",
  csrfOriginProtection,
  authAny,
  authorizePermissions("sessions:manage"),
  validateRequest({ body: emptyBodySchema }),
  pruneSessions
);
authRouter.patch(
  "/sessions/:sessionId",
  csrfOriginProtection,
  authAny,
  authorizePermissions("sessions:read"),
  validateRequest({ params: sessionIdParamSchema, body: renameSessionSchema }),
  renameSession
);
authRouter.delete(
  "/sessions/:sessionId",
  csrfOriginProtection,
  authAny,
  authorizePermissions("sessions:manage"),
  validateRequest({ params: sessionIdParamSchema }),
  revokeSession
);

export default authRouter;
