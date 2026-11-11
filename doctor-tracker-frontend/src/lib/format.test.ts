import { describe, expect, it } from "vitest";

import {
  EM_DASH,
  formatAgeGender,
  formatBucket,
  formatDate,
  formatDateRange,
  formatNumber,
  getDelta,
  getInitials,
  isValidISODate,
  parseISODate,
  pluralize,
  toISODate,
} from "@/lib/format";

describe("formatDate", () => {
  it("renders `12 Nov 2026` in UTC", () => {
    expect(formatDate("2026-11-12T08:30:00.000Z")).toBe("12 Nov 2026");
    expect(formatDate("2026-01-01T00:00:00.000Z")).toBe("01 Jan 2026");
  });

  it("does not shift the day for timestamps late in the UTC day", () => {
    expect(formatDate("2026-11-12T23:59:59.999Z")).toBe("12 Nov 2026");
  });

  it("returns an em dash for missing or invalid input", () => {
    expect(formatDate(null)).toBe(EM_DASH);
    expect(formatDate(undefined)).toBe(EM_DASH);
    expect(formatDate("not a date")).toBe(EM_DASH);
  });
});

describe("formatNumber", () => {
  it("groups thousands", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatNumber(0)).toBe("0");
  });

  it("returns an em dash for non-numbers", () => {
    expect(formatNumber(null)).toBe(EM_DASH);
    expect(formatNumber(Number.NaN)).toBe(EM_DASH);
  });
});

describe("formatBucket", () => {
  it("uses month + year for monthly buckets and day + month otherwise", () => {
    expect(formatBucket("2026-03-01T00:00:00.000Z", "month")).toBe("Mar 26");
    expect(formatBucket("2026-03-09T00:00:00.000Z", "week")).toBe("9 Mar");
    expect(formatBucket("2026-03-09T00:00:00.000Z", "day")).toBe("9 Mar");
    expect(formatBucket("nope", "day")).toBe("");
  });
});

describe("ISO date helpers", () => {
  it("round-trips a local calendar date", () => {
    const date = parseISODate("2026-02-28");
    expect(date).toBeInstanceOf(Date);
    expect(toISODate(date as Date)).toBe("2026-02-28");
  });

  it("rejects malformed and impossible dates", () => {
    expect(parseISODate("2026-2-3")).toBeUndefined();
    expect(parseISODate("2026-02-31")).toBeUndefined();
    expect(parseISODate("")).toBeUndefined();
    expect(parseISODate(null)).toBeUndefined();
    expect(isValidISODate("2026-13-01")).toBe(false);
    expect(isValidISODate("2024-02-29")).toBe(true);
  });

  it("pads month and day", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("formatDateRange", () => {
  it("omits the first year when both ends share it", () => {
    expect(formatDateRange("2026-10-01", "2026-10-31")).toBe("1 Oct – 31 Oct 2026");
  });

  it("keeps both years across a year boundary", () => {
    expect(formatDateRange("2025-12-15", "2026-01-15")).toBe("15 Dec 2025 – 15 Jan 2026");
  });

  it("handles open-ended and empty ranges", () => {
    expect(formatDateRange("2026-10-01", undefined)).toBe("From 01 Oct 2026");
    expect(formatDateRange(undefined, "2026-10-31")).toBe("Until 31 Oct 2026");
    expect(formatDateRange(undefined, undefined)).toBe("Any time");
    expect(formatDateRange(undefined, undefined, "All time")).toBe("All time");
  });
});

describe("getInitials", () => {
  it("uses the first and last word", () => {
    expect(getInitials("Sara Khan")).toBe("SK");
    expect(getInitials("Amir bin Ali")).toBe("AA");
  });

  it("ignores titles", () => {
    expect(getInitials("Dr. Sara Khan")).toBe("SK");
    expect(getInitials("dr sara khan")).toBe("SK");
    expect(getInitials("Prof. Lee")).toBe("L");
  });

  it("handles single names, extra whitespace and empty input", () => {
    expect(getInitials("  Madonna  ")).toBe("M");
    expect(getInitials("")).toBe("?");
    expect(getInitials(null)).toBe("?");
    expect(getInitials("Dr.")).toBe("?");
  });
});

describe("formatAgeGender", () => {
  it("joins the parts that are set", () => {
    expect(formatAgeGender(34, "female")).toBe("34 · Female");
    expect(formatAgeGender(0, null)).toBe("0");
    expect(formatAgeGender(null, "other")).toBe("Other");
    expect(formatAgeGender(null, null)).toBe(EM_DASH);
  });
});

describe("getDelta", () => {
  it("reports direction with a signed label", () => {
    expect(getDelta(12, 5)).toEqual({ direction: "up", label: "+7" });
    expect(getDelta(5, 12)).toEqual({ direction: "down", label: "−7" });
    expect(getDelta(5, 5)).toEqual({ direction: "flat", label: "0" });
  });
});

describe("pluralize", () => {
  it("picks the right noun form", () => {
    expect(pluralize(1, "doctor")).toBe("1 doctor");
    expect(pluralize(0, "doctor")).toBe("0 doctors");
    expect(pluralize(1280, "patient")).toBe("1,280 patients");
    expect(pluralize(2, "child", "children")).toBe("2 children");
  });
});
