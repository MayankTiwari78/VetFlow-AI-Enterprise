import { describe, expect, it } from "vitest";

import {
  currentPathWithSearch,
  isSafeInternalReturnTo,
  loginHrefForReturnTo,
  normalizeReturnTo,
  safeLoginDestination
} from "./authNavigation";

describe("auth navigation helpers", () => {
  it("accepts safe same-origin internal returnTo values", () => {
    expect(isSafeInternalReturnTo("/my-profile")).toBe(true);
    expect(isSafeInternalReturnTo("/my-appointments?status=upcoming#next")).toBe(true);
    expect(normalizeReturnTo("/security")).toBe("/security");
  });

  it("rejects external, protocol-relative, script, malformed, and login-loop returnTo values", () => {
    for (const value of [
      "https://example.test/my-profile",
      "//example.test/my-profile",
      "javascript:alert(1)",
      " /my-profile",
      "/\\example.test",
      "/my-profile\n",
      "",
      null
    ]) {
      expect(normalizeReturnTo(value)).toBe("/pet-owner");
    }

    expect(safeLoginDestination("/login?returnTo=%2Fsecurity")).toBe("/pet-owner");
  });

  it("builds encoded login links for protected redirects", () => {
    expect(loginHrefForReturnTo("/my-profile?tab=account")).toBe(
      "/login?returnTo=%2Fmy-profile%3Ftab%3Daccount"
    );
    expect(loginHrefForReturnTo("https://example.test")).toBe("/login?returnTo=%2Fpet-owner");
  });

  it("preserves current internal path and query string", () => {
    expect(currentPathWithSearch("/security", new URLSearchParams("tab=sessions"))).toBe(
      "/security?tab=sessions"
    );
  });
});
