import { describe, expect, it } from "vitest";

import { BADGE_TINTS, badgeTint, badgeTintIndex } from "@/lib/badge";

describe("badgeTint", () => {
  it("is deterministic", () => {
    expect(badgeTint("Cardiology")).toBe(badgeTint("Cardiology"));
  });

  it("ignores case and surrounding whitespace", () => {
    expect(badgeTint("  cardiology ")).toBe(badgeTint("CARDIOLOGY"));
  });

  it("always returns one of the eight tints", () => {
    for (const label of ["", "a", "Neurology", "Type 2 Diabetes", "ডায়াবেটিস"]) {
      const index = badgeTintIndex(label);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(BADGE_TINTS.length);
      expect(BADGE_TINTS).toContain(badgeTint(label));
    }
  });

  it("matches the documented hash (h * 31 + charCode, unsigned)", () => {
    // "ab" -> (97 * 31 + 98) = 3105 -> 3105 % 8 = 1
    expect(badgeTintIndex("ab")).toBe(1);
    expect(badgeTintIndex("")).toBe(0);
  });

  it("spreads common labels over more than one tint", () => {
    const labels = ["Cardiology", "Neurology", "Oncology", "Pediatrics", "Dermatology", "Orthopedics"];
    expect(new Set(labels.map(badgeTintIndex)).size).toBeGreaterThan(1);
  });

  it("never uses red or green tints", () => {
    for (const tint of BADGE_TINTS) {
      expect(tint).not.toMatch(/\b(?:bg|text|ring)-(?:red|rose|green|emerald)-/);
    }
  });
});
