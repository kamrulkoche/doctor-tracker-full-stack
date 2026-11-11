import { describe, expect, it } from "vitest";

import { isNavItemActive } from "@/components/layout/nav-items";
import { parseDoctorListState, toDoctorListQuery } from "@/features/doctors/schemas";
import {
  parsePatientListState,
  toDoctorPatientListQuery,
  toPatientListQuery,
} from "@/features/patients/schemas";
import {
  buildLoginUrl,
  clearSearchParams,
  compactQuery,
  mergeSearchParams,
  nextSort,
  parseBaseListState,
  parseDateParam,
  parseEnum,
  parseLimit,
  parseObjectId,
  parsePage,
  parseText,
  safeNextPath,
} from "@/lib/url-filters";

const params = (query: string) => new URLSearchParams(query);

describe("primitive parsers", () => {
  it("parsePage accepts positive integers only", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage(null)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
    expect(parsePage("abc")).toBe(1);
  });

  it("parseLimit accepts only the offered page sizes", () => {
    expect(parseLimit("20")).toBe(20);
    expect(parseLimit("50")).toBe(50);
    expect(parseLimit("15")).toBe(10);
    expect(parseLimit("1000")).toBe(10);
    expect(parseLimit(null)).toBe(10);
  });

  it("parseText trims, caps and drops empty values", () => {
    expect(parseText("  Cardiology ")).toBe("Cardiology");
    expect(parseText("   ")).toBeUndefined();
    expect(parseText(null)).toBeUndefined();
    expect(parseText("abcdef", 3)).toBe("abc");
  });

  it("parseEnum, parseObjectId and parseDateParam reject anything unexpected", () => {
    expect(parseEnum("asc", ["asc", "desc"] as const)).toBe("asc");
    expect(parseEnum("up", ["asc", "desc"] as const)).toBeUndefined();
    expect(parseObjectId("64b7f0c2a1b2c3d4e5f60718")).toBe("64b7f0c2a1b2c3d4e5f60718");
    expect(parseObjectId("123")).toBeUndefined();
    expect(parseObjectId("zzb7f0c2a1b2c3d4e5f60718")).toBeUndefined();
    expect(parseDateParam("2026-10-01")).toBe("2026-10-01");
    expect(parseDateParam("2026-02-30")).toBeUndefined();
    expect(parseDateParam("01/10/2026")).toBeUndefined();
  });
});

describe("parseBaseListState", () => {
  const SORT = ["name", "createdAt"] as const;

  it("returns defaults for an empty query", () => {
    expect(parseBaseListState(params(""), SORT)).toEqual({
      page: 1,
      limit: 10,
      search: "",
      sortBy: undefined,
      sortOrder: "desc",
      from: undefined,
      to: undefined,
    });
  });

  it("parses a full query", () => {
    expect(
      parseBaseListState(
        params("page=4&limit=50&search=%20sara%20&sortBy=name&sortOrder=desc&from=2026-01-01&to=2026-03-31"),
        SORT,
      ),
    ).toEqual({
      page: 4,
      limit: 50,
      search: "sara",
      sortBy: "name",
      sortOrder: "desc",
      from: "2026-01-01",
      to: "2026-03-31",
    });
  });

  it("ignores unknown sort fields and a sort order without a field", () => {
    const state = parseBaseListState(params("sortBy=password&sortOrder=asc"), SORT);
    expect(state.sortBy).toBeUndefined();
    expect(state.sortOrder).toBe("desc");
  });

  it("defaults a sorted column to ascending", () => {
    expect(parseBaseListState(params("sortBy=name"), SORT).sortOrder).toBe("asc");
    expect(parseBaseListState(params("sortBy=name&sortOrder=sideways"), SORT).sortOrder).toBe("asc");
  });

  it("drops the end of an inverted date range instead of sending an invalid one", () => {
    const state = parseBaseListState(params("from=2026-05-01&to=2026-04-01"), SORT);
    expect(state.from).toBe("2026-05-01");
    expect(state.to).toBeUndefined();
  });

  it("caps the search length at 100 characters", () => {
    expect(parseBaseListState(params(`search=${"a".repeat(150)}`), SORT).search).toHaveLength(100);
  });
});

describe("feature list state", () => {
  it("parses doctor filters and builds the API query", () => {
    const state = parseDoctorListState(
      params("specialization=Cardiology&hospital=City%20General&page=2&sortBy=hospital&sortOrder=desc"),
    );
    expect(state.specialization).toBe("Cardiology");
    expect(state.hospital).toBe("City General");
    expect(toDoctorListQuery(state)).toEqual({
      page: 2,
      limit: 10,
      search: undefined,
      sortBy: "hospital",
      sortOrder: "desc",
      from: undefined,
      to: undefined,
      specialization: "Cardiology",
      hospital: "City General",
    });
  });

  it("omits sortOrder when no sort column is active (server default applies)", () => {
    expect(toDoctorListQuery(parseDoctorListState(params(""))).sortOrder).toBeUndefined();
  });

  it("parses patient deep links from the dashboard", () => {
    const state = parsePatientListState(
      params("doctorId=64b7f0c2a1b2c3d4e5f60718&condition=Asthma&gender=female"),
    );
    expect(state.doctorId).toBe("64b7f0c2a1b2c3d4e5f60718");
    expect(state.condition).toBe("Asthma");
    expect(state.gender).toBe("female");
    expect(toPatientListQuery(state).doctorId).toBe("64b7f0c2a1b2c3d4e5f60718");
  });

  it("rejects malformed patient filters", () => {
    const state = parsePatientListState(params("doctorId=nope&gender=unknown&sortBy=email"));
    expect(state.doctorId).toBeUndefined();
    expect(state.gender).toBeUndefined();
    expect(state.sortBy).toBeUndefined();
  });

  it("never sends doctorId to the doctor-scoped patients endpoint", () => {
    const state = parsePatientListState(params("doctorId=64b7f0c2a1b2c3d4e5f60718&condition=Asthma"));
    const query = toDoctorPatientListQuery(state);
    expect("doctorId" in query).toBe(false);
    expect(query.condition).toBe("Asthma");
  });
});

describe("mergeSearchParams", () => {
  it("sets values and resets the page when a filter changes", () => {
    expect(mergeSearchParams("page=3&search=sara", { specialization: "Cardiology" })).toBe(
      "search=sara&specialization=Cardiology",
    );
  });

  it("keeps the page when the patch sets it", () => {
    expect(mergeSearchParams("search=sara", { page: 3 })).toBe("page=3&search=sara");
  });

  it("removes keys for null, undefined and empty strings", () => {
    expect(mergeSearchParams("a=1&b=2&c=3", { a: null, b: undefined, c: "" })).toBe("");
  });

  it("omits defaults so URLs stay short and canonical", () => {
    expect(mergeSearchParams("", { page: 1 })).toBe("");
    expect(mergeSearchParams("limit=50", { limit: 10 })).toBe("");
    expect(mergeSearchParams("", { limit: 20 })).toBe("limit=20");
  });

  it("accepts a leading question mark and encodes values", () => {
    expect(mergeSearchParams("?page=2", { hospital: "St Mary & Co" })).toBe("hospital=St+Mary+%26+Co");
  });

  it("is order-independent (sorted keys)", () => {
    expect(mergeSearchParams("b=2&a=1", { page: 2 })).toBe("a=1&b=2&page=2");
  });
});

describe("clearSearchParams", () => {
  it("removes the listed keys and the page, keeping unrelated ones", () => {
    expect(clearSearchParams("page=4&search=x&specialization=y&limit=20", ["search", "specialization"])).toBe(
      "limit=20",
    );
  });
});

describe("compactQuery", () => {
  it("drops unset values but keeps zero and false", () => {
    expect(compactQuery({ a: undefined, b: null, c: "", d: 0, e: false, f: "x" })).toEqual({
      d: 0,
      e: false,
      f: "x",
    });
  });
});

describe("nextSort", () => {
  it("cycles none -> asc -> desc -> none", () => {
    expect(nextSort({ sortBy: undefined, sortOrder: "desc" }, "name")).toEqual({
      sortBy: "name",
      sortOrder: "asc",
    });
    expect(nextSort({ sortBy: "name", sortOrder: "asc" }, "name")).toEqual({
      sortBy: "name",
      sortOrder: "desc",
    });
    expect(nextSort({ sortBy: "name", sortOrder: "desc" }, "name")).toEqual({
      sortBy: undefined,
      sortOrder: undefined,
    });
  });

  it("starts ascending when switching column", () => {
    expect(nextSort({ sortBy: "name", sortOrder: "desc" }, "hospital")).toEqual({
      sortBy: "hospital",
      sortOrder: "asc",
    });
  });
});

describe("safeNextPath / buildLoginUrl", () => {
  it("accepts same-origin relative paths", () => {
    expect(safeNextPath("/doctors?page=2", "/dashboard")).toBe("/doctors?page=2");
  });

  it("rejects open-redirect attempts", () => {
    for (const value of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "doctors",
      "",
      null,
      "/login",
      "/login?next=/login",
    ]) {
      expect(safeNextPath(value, "/dashboard")).toBe("/dashboard");
    }
  });

  it("builds the login URL with an encoded next param", () => {
    expect(buildLoginUrl("/patients?condition=Asthma&page=2")).toBe(
      "/login?next=%2Fpatients%3Fcondition%3DAsthma%26page%3D2",
    );
    expect(buildLoginUrl("/dashboard")).toBe("/login");
    expect(buildLoginUrl(null)).toBe("/login");
    expect(buildLoginUrl("//evil.example")).toBe("/login");
  });
});

describe("isNavItemActive", () => {
  it("matches the section and its children only", () => {
    expect(isNavItemActive("/doctors", "/doctors")).toBe(true);
    expect(isNavItemActive("/doctors/64b7f0c2a1b2c3d4e5f60718", "/doctors")).toBe(true);
    expect(isNavItemActive("/doctors-archive", "/doctors")).toBe(false);
    expect(isNavItemActive("/patients", "/doctors")).toBe(false);
  });
});
