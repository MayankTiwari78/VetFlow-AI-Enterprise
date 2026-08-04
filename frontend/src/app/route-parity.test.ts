import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const routeFiles = [
  "src/app/page.tsx",
  "src/app/doctors/page.tsx",
  "src/app/doctors/[speciality]/page.tsx",
  "src/app/appointment/[docId]/page.tsx",
  "src/app/login/page.tsx",
  "src/app/about/page.tsx",
  "src/app/contact/page.tsx",
  "src/app/my-appointments/page.tsx",
  "src/app/my-profile/page.tsx",
  "src/app/health-profile/page.tsx",
  "src/app/verify/page.tsx",
  "src/app/verify-email/page.tsx",
  "src/app/forgot-password/page.tsx",
  "src/app/reset-password/page.tsx",
  "src/app/otp/page.tsx",
  "src/app/two-factor-login/page.tsx",
  "src/app/security/page.tsx"
];

describe("patient Next.js route parity", () => {
  it("retains every pre-migration patient route as an App Router entry", () => {
    routeFiles.forEach((routeFile) => {
      expect(existsSync(resolve(process.cwd(), routeFile))).toBe(true);
    });
  });
});
