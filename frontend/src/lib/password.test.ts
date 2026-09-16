import { describe, expect, it } from "vitest";

import {
  PASSWORD_POLICY_MESSAGE,
  getPasswordRequirements,
  getPasswordStrength,
  validatePassword
} from "./password";

describe("frontend password policy", () => {
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
      expect(validatePassword(password) === null).toBe(accepted);

      if (!accepted) {
        expect(validatePassword(password)).toBe(PASSWORD_POLICY_MESSAGE);
      }
    });
  }

  it("reports all five requirements dynamically", () => {
    const weak = getPasswordRequirements("12345678");
    expect(weak.filter((item) => item.met).map((item) => item.key)).toEqual(["length", "number"]);
    expect(getPasswordStrength("12345678")).toEqual({ label: "Weak", metCount: 2, level: "weak" });

    const strong = getPasswordRequirements("Vet@2026");
    expect(strong.every((item) => item.met)).toBe(true);
    expect(getPasswordStrength("Vet@2026")).toEqual({ label: "Strong", metCount: 5, level: "strong" });
    expect(getPasswordStrength("Password1234").label).toBe("Medium");
  });
});
