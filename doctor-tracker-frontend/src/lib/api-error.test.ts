import { describe, expect, it, vi } from "vitest";

import {
  ApiError,
  getErrorMessage,
  hasFieldErrors,
  isApiError,
  isNotFoundError,
  normalizeApiError,
  splitFieldErrors,
} from "@/lib/api-error";
import { applyServerErrors, mergeSuggestions } from "@/lib/form-errors";

function httpError(status: number, data: unknown) {
  return { isAxiosError: true, response: { status, data } };
}

describe("normalizeApiError", () => {
  it("reads the contract error envelope", () => {
    const error = normalizeApiError(
      httpError(400, {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: [{ path: "email", message: "Enter a valid email address" }],
        },
      }),
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.status).toBe(400);
    expect(error.message).toBe("Request validation failed");
    expect(error.details).toEqual([{ path: "email", message: "Enter a valid email address" }]);
    expect(error.detail("email")).toBe("Enter a valid email address");
    expect(error.detail("name")).toBeUndefined();
  });

  it("returns the same instance for an ApiError", () => {
    const original = new ApiError({ code: "NOT_FOUND", message: "Doctor not found", status: 404 });
    expect(normalizeApiError(original)).toBe(original);
  });

  it("maps a missing response to NETWORK_ERROR", () => {
    const error = normalizeApiError({ isAxiosError: true, code: "ERR_NETWORK", message: "Network Error" });
    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.status).toBe(0);
    expect(error.message).toMatch(/reach the server/i);
  });

  it("falls back to the HTTP status when the body is not a contract envelope", () => {
    expect(normalizeApiError(httpError(401, "<html>")).code).toBe("UNAUTHENTICATED");
    expect(normalizeApiError(httpError(404, null)).code).toBe("NOT_FOUND");
    expect(normalizeApiError(httpError(413, {})).code).toBe("PAYLOAD_TOO_LARGE");
    expect(normalizeApiError(httpError(429, {})).code).toBe("RATE_LIMITED");
    expect(normalizeApiError(httpError(502, {})).code).toBe("INTERNAL_ERROR");
    expect(normalizeApiError(httpError(418, {})).code).toBe("UNKNOWN_ERROR");
  });

  it("does not trust unknown codes or malformed details", () => {
    const error = normalizeApiError(
      httpError(403, {
        error: {
          code: "SOMETHING_NEW",
          message: "",
          details: [{ path: 1 }, "x", { path: "a", message: "b" }],
        },
      }),
    );
    expect(error.code).toBe("FORBIDDEN");
    expect(error.message.length).toBeGreaterThan(0);
    expect(error.details).toEqual([{ path: "a", message: "b" }]);
  });

  it("handles non-object throwables", () => {
    expect(normalizeApiError("boom").code).toBe("NETWORK_ERROR");
    expect(normalizeApiError(undefined).code).toBe("NETWORK_ERROR");
  });

  it("keeps DOCTOR_HAS_PATIENTS details", () => {
    const error = normalizeApiError(
      httpError(409, {
        success: false,
        error: {
          code: "DOCTOR_HAS_PATIENTS",
          message: "Doctor has 3 patients. Reassign or remove them first.",
          details: [{ path: "patientCount", message: "3" }],
        },
      }),
    );
    expect(error.code).toBe("DOCTOR_HAS_PATIENTS");
    expect(Number(error.detail("patientCount"))).toBe(3);
  });
});

describe("error helpers", () => {
  const duplicate = new ApiError({
    code: "DUPLICATE_EMAIL",
    message: "Email already in use",
    status: 409,
    details: [{ path: "email", message: "This email is already in use" }],
  });

  it("identifies ApiError and not-found style errors", () => {
    expect(isApiError(duplicate)).toBe(true);
    expect(isApiError(new Error("x"))).toBe(false);
    expect(isNotFoundError(new ApiError({ code: "NOT_FOUND", message: "", status: 404 }))).toBe(true);
    expect(isNotFoundError(new ApiError({ code: "INVALID_ID", message: "", status: 400 }))).toBe(true);
    expect(isNotFoundError(duplicate)).toBe(false);
  });

  it("recognises errors that carry field details", () => {
    expect(hasFieldErrors(duplicate)).toBe(true);
    expect(hasFieldErrors(new ApiError({ code: "VALIDATION_ERROR", message: "x" }))).toBe(false);
    expect(
      hasFieldErrors(new ApiError({ code: "INTERNAL_ERROR", message: "x", details: duplicate.details })),
    ).toBe(false);
  });

  it("splits details into known fields and the rest, keeping the first message per field", () => {
    const error = new ApiError({
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: [
        { path: "name", message: "Too short" },
        { path: "name", message: "Second message" },
        { path: "from", message: "Range too large" },
      ],
    });
    expect(splitFieldErrors(error, ["name", "email"] as const)).toEqual({
      fieldErrors: { name: "Too short" },
      unmatched: [{ path: "from", message: "Range too large" }],
    });
  });

  it("produces a readable message for anything", () => {
    expect(getErrorMessage(duplicate)).toBe("Email already in use");
    expect(getErrorMessage(new Error("Plain"))).toBe("Plain");
    expect(getErrorMessage(null, "Fallback")).toBe("Fallback");
  });
});

describe("applyServerErrors", () => {
  it("sets field errors and returns null when everything was mapped", () => {
    const setError = vi.fn();
    const error = new ApiError({
      code: "DUPLICATE_EMAIL",
      message: "Email already in use",
      details: [{ path: "email", message: "This email is already in use" }],
    });
    const result = applyServerErrors<{ name: string; email: string }>(error, setError, ["name", "email"]);
    expect(result).toBeNull();
    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalledWith(
      "email",
      { type: "server", message: "This email is already in use" },
      { shouldFocus: true },
    );
  });

  it("returns a form-level message when no detail matches a field", () => {
    const setError = vi.fn();
    const error = new ApiError({
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: [{ path: "unknown", message: "Unknown field" }],
    });
    expect(applyServerErrors<{ name: string }>(error, setError, ["name"])).toBe(
      "Request validation failed: Unknown field",
    );
    expect(setError).not.toHaveBeenCalled();
  });

  it("returns the message for non-field errors", () => {
    const setError = vi.fn();
    const error = new ApiError({ code: "INTERNAL_ERROR", message: "Server exploded", status: 500 });
    expect(applyServerErrors<{ name: string }>(error, setError, ["name"])).toBe("Server exploded");
  });
});

describe("mergeSuggestions", () => {
  it("merges, de-duplicates case-insensitively and sorts", () => {
    expect(mergeSuggestions(["Neurology", "cardiology"], ["Cardiology", "Oncology"], undefined)).toEqual([
      "cardiology",
      "Neurology",
      "Oncology",
    ]);
  });

  it("drops blanks", () => {
    expect(mergeSuggestions(["", "  ", "A"])).toEqual(["A"]);
  });
});
