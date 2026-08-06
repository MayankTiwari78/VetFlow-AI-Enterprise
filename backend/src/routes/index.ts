import { Router } from "express";

import { health, readiness } from "../controllers/healthController.js";
import adminRouter from "./adminRoutes.js";
import auditRouter from "./auditRoutes.js";
import authRouter from "./authRoutes.js";
import authorizationRouter from "./authorizationRoutes.js";
import doctorRouter from "./doctorRoutes.js";
import organizationRouter from "./organizationRoutes.js";
import userRouter from "./userRoutes.js";
import veterinaryRouter from "./veterinaryRoutes.js";

const router = Router();

router.get("/health", health);
router.get("/ready", readiness);
router.use("/v1/auth", authRouter);
router.use("/v1/authorization", authorizationRouter);
router.use("/v1/organizations", organizationRouter);
router.use("/v1/audit-logs", auditRouter);
router.use("/v1/veterinary", veterinaryRouter);
router.use("/user", userRouter);
router.use("/admin", adminRouter);
router.use("/doctor", doctorRouter);

export default router;
