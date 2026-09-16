import { describe, expect, it } from "vitest";

import { PASSWORD_POLICY_MESSAGE } from "../src/constants/auth.js";
import { passwordSchema } from "../src/validators/common.js";

describe("password policy", () => {
  const cases: Array<{ password: string; accepted: boolean }> = [
    { password: "12345678", accepted: false },
    { password: "password1!", accepted: false },
    { password: "PASSWORD1!", accepted: false },
    { password: "Password!!!!!", accepted: false },
    { password: "Password1234", accepted: false },
    { password: "Vet@2026", accepted: true },
    { password: "PetCare#1", accepted: true },
    { password: "Abcd@123", accepted: true },
    { password: "VetFlow@1", accepted: true }
  ];

  for (const { password, accepted } of cases) {
    it(`${accepted ? "accepts" : "rejects"} ${password}`, () => {
      const result = passwordSchema.safeParse(password);

      expect(result.success).toBe(accepted);

      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(PASSWORD_POLICY_MESSAGE);
      }
    });
  }

  it("requires every complexity rule for new credentials", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercase1!").success).toBe(false);
    expect(passwordSchema.safeParse("ALLUPPERCASE1!").success).toBe(false);
    expect(passwordSchema.safeParse("NoNumber!!!!").success).toBe(false);
    expect(passwordSchema.safeParse("NoSpecial12").success).toBe(false);
  });
});
