import type { JwtPayload } from "jsonwebtoken";

import type { AccountType } from "../constants/auth.js";
import type { EnterpriseRole, Permission } from "../constants/rbac.js";

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload | string;
      authUserId?: string;
      authDoctorId?: string;
      authAdminEmail?: string;
      authAccountId?: string;
      authAccountType?: AccountType;
      authRole?: EnterpriseRole;
      authPermissions?: Permission[];
      authOrganizationId?: string;
      authMembershipId?: string;
      authSessionId?: string;
      requestId?: string;
    }
  }
}

export {};
