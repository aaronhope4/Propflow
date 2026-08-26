import { describe, expect, it } from "vitest";
import { getShareExpiry, isShareExpired } from "./documentShare";

describe("document share expiry", () => {
  it("calculates share expiry from the selected duration", () => {
    const now = new Date("2026-08-14T12:00:00.000Z");
    expect(getShareExpiry(24, now).toISOString()).toBe("2026-08-15T12:00:00.000Z");
    expect(getShareExpiry(720, now).toISOString()).toBe("2026-09-13T12:00:00.000Z");
  });

  it("marks missing and elapsed expirations unavailable", () => {
    const now = new Date("2026-08-14T12:00:00.000Z");
    expect(isShareExpired(null, now)).toBe(true);
    expect(isShareExpired(new Date("2026-08-14T11:59:59.000Z"), now)).toBe(true);
    expect(isShareExpired(new Date("2026-08-14T12:00:01.000Z"), now)).toBe(false);
  });
});
