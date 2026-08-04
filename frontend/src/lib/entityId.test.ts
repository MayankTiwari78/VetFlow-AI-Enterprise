import { describe, expect, it } from "vitest";

import { normalizeEntityId } from "./entityId";

describe("normalizeEntityId", () => {
  it("keeps route-safe string ids", () => {
    expect(normalizeEntityId("6a5b7a15498276530b8d1010")).toBe("6a5b7a15498276530b8d1010");
  });

  it("normalizes Mongo ObjectId buffer shapes returned through JSON", () => {
    expect(
      normalizeEntityId({
        buffer: {
          0: 106,
          1: 91,
          2: 122,
          3: 21,
          4: 73,
          5: 130,
          6: 118,
          7: 83,
          8: 11,
          9: 141,
          10: 16,
          11: 16
        }
      })
    ).toBe("6a5b7a15498276530b8d1010");
  });

  it("rejects object values that would otherwise become [object Object]", () => {
    expect(normalizeEntityId({ value: "not-an-id" })).toBe("");
  });
});
