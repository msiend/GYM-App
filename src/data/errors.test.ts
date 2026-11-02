import { it, expect } from "vitest";
import { saveErrorMessage } from "./errors";
it("does not misreport application errors as full storage", () => {
  const message = saveErrorMessage(
    new TypeError("missing API"),
    "your profile",
  );
  expect(message).toContain("TypeError");
  expect(message).not.toContain("storage is full");
  expect(saveErrorMessage({ name: "QuotaExceededError" })).toContain(
    "storage is full",
  );
  expect(saveErrorMessage({ name: "SecurityError" })).toContain(
    "blocking site storage",
  );
});
