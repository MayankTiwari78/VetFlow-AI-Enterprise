import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const routeFiles = [
  "src/app/page.tsx",
  "src/app/admin-dashboard/page.tsx",
  "src/app/all-appointments/page.tsx",
  "src/app/add-doctor/page.tsx",
  "src/app/doctor-list/page.tsx",
  "src/app/patients/page.tsx",
  "src/app/memberships/page.tsx",
  "src/app/audit-logs/page.tsx",
  "src/app/security/page.tsx",
  "src/app/doctor-dashboard/page.tsx",
  "src/app/doctor-appointments/page.tsx",
  "src/app/doctor-profile/page.tsx"
];

describe("portal Next.js route parity", () => {
  it("retains every pre-migration admin and doctor route as an App Router entry", () => {
    routeFiles.forEach((routeFile) => {
      expect(existsSync(resolve(process.cwd(), routeFile))).toBe(true);
    });
  });
});
