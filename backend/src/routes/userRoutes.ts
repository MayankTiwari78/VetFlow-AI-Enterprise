import { Router } from "express";

import { loginUser, registerUser } from "../controllers/authController.js";
import {
  bookAppointment,
  cancelAppointment,
  addFamilyMember,
  deleteFamilyMember,
  familyMembers,
  getHealthProfile,
  getProfile,
  healthCard,
  healthCardLookup,
  listAppointment,
  medicalTimeline,
  paymentRazorpay,
  paymentStripe,
  patientMedicalRecords,
  updateHealthProfile,
  updateProfile,
  verifyRazorpay,
  verifyStripe
} from "../controllers/userController.js";
import { authRateLimiter, registrationRateLimiter } from "../middleware/security.js";
import { authUser, authorizePermissions } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { loginSchema, registerUserSchema } from "../validators/authValidators.js";
import {
  bookAppointmentSchema,
  cancelAppointmentSchema,
  paymentInitSchema,
  updateHealthProfileSchema,
  updateProfileSchema,
  verifyRazorpaySchema,
  verifyStripeSchema
} from "../validators/userValidators.js";
import {
  familyMemberCreateSchema,
  familyMemberParamsSchema
} from "../validators/familyMemberValidators.js";
import { healthCardLookupParamsSchema } from "../validators/medicalRecordValidators.js";

const userRouter = Router();

userRouter.post(
  "/register",
  registrationRateLimiter,
  validateRequest({ body: registerUserSchema }),
  registerUser
);
userRouter.post("/login", authRateLimiter, validateRequest({ body: loginSchema }), loginUser);

userRouter.get("/get-profile", authUser, authorizePermissions("users:read"), getProfile);
userRouter.get(
  "/health-profile",
  authUser,
  authorizePermissions("users:read"),
  getHealthProfile
);
userRouter.put(
  "/health-profile",
  authUser,
  authorizePermissions("users:manage"),
  validateRequest({ body: updateHealthProfileSchema }),
  updateHealthProfile
);
userRouter.post(
  "/update-profile",
  authUser,
  authorizePermissions("users:manage"),
  upload.single("image"),
  validateRequest({ body: updateProfileSchema }),
  updateProfile
);
userRouter.post(
  "/book-appointment",
  authUser,
  authorizePermissions("appointments:create"),
  validateRequest({ body: bookAppointmentSchema }),
  bookAppointment
);
userRouter.get(
  "/appointments",
  authUser,
  authorizePermissions("appointments:read"),
  listAppointment
);
userRouter.get(
  "/medical-timeline",
  authUser,
  authorizePermissions("users:read", "appointments:read"),
  medicalTimeline
);
userRouter.get(
  "/medical-records",
  authUser,
  authorizePermissions("users:read"),
  patientMedicalRecords
);
userRouter.get(
  "/family-members",
  authUser,
  authorizePermissions("users:read"),
  familyMembers
);
userRouter.post(
  "/family-members",
  authUser,
  authorizePermissions("users:manage"),
  validateRequest({ body: familyMemberCreateSchema }),
  addFamilyMember
);
userRouter.delete(
  "/family-members/:familyMemberId",
  authUser,
  authorizePermissions("users:manage"),
  validateRequest({ params: familyMemberParamsSchema }),
  deleteFamilyMember
);
userRouter.get("/health-card", authUser, authorizePermissions("users:read"), healthCard);
userRouter.get(
  "/health-card/lookup/:lookupId",
  authUser,
  authorizePermissions("users:read"),
  validateRequest({ params: healthCardLookupParamsSchema }),
  healthCardLookup
);
userRouter.post(
  "/cancel-appointment",
  authUser,
  authorizePermissions("appointments:cancel"),
  validateRequest({ body: cancelAppointmentSchema }),
  cancelAppointment
);
userRouter.post(
  "/payment-razorpay",
  authUser,
  authorizePermissions("billing:read"),
  validateRequest({ body: paymentInitSchema }),
  paymentRazorpay
);
userRouter.post(
  "/verifyRazorpay",
  authUser,
  authorizePermissions("billing:read"),
  validateRequest({ body: verifyRazorpaySchema }),
  verifyRazorpay
);
userRouter.post(
  "/payment-stripe",
  authUser,
  authorizePermissions("billing:read"),
  validateRequest({ body: paymentInitSchema }),
  paymentStripe
);
userRouter.post(
  "/verifyStripe",
  authUser,
  authorizePermissions("billing:read"),
  validateRequest({ body: verifyStripeSchema }),
  verifyStripe
);

export default userRouter;
