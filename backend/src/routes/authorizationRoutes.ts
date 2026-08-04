import { Router } from "express";

import {
  currentAuthorization,
  rolePermissionMatrix
} from "../controllers/authorizationController.js";
import { authAny, authorizePermissions } from "../middleware/auth.js";

const authorizationRouter = Router();

authorizationRouter.get("/me", authAny, currentAuthorization);
authorizationRouter.get(
  "/roles",
  authAny,
  authorizePermissions("roles:read"),
  rolePermissionMatrix
);

export default authorizationRouter;
