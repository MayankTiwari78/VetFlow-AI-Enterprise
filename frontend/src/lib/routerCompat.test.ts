import { describe, expect, it } from "vitest";

import { normalizeClientHref } from "./routerCompat";

describe("normalizeClientHref", () => {
  it("keeps internal routes and rejects event/object values", () => {
    expect(normalizeClientHref("/security")).toBe("/security");
    expect(normalizeClientHref({ type: "click" })).toBe("/");
    expect(normalizeClientHref(undefined)).toBe("/");
    expect(normalizeClientHref("https://example.test")).toBe("/");
  });
});
