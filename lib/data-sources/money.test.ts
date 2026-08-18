import { describe, expect, it } from "vitest";
import { centsToDollars } from "./money";

describe("centsToDollars", () => {
  it("converts whole-dollar cent amounts", () => {
    expect(centsToDollars(9900)).toBe(99);
    expect(centsToDollars(100)).toBe(1);
    expect(centsToDollars(0)).toBe(0);
  });

  it("preserves cents without floating point drift", () => {
    expect(centsToDollars(1599)).toBe(15.99);
    expect(centsToDollars(150)).toBe(1.5);
    expect(centsToDollars(1)).toBe(0.01);
  });
});
