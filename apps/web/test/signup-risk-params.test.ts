import { expect, test } from "bun:test";
import { signUpRiskParams } from "../src/lib/signup-risk-params";

test("an oversized device header cannot remove the trusted IP or user agent", () => {
  const params = signUpRiskParams(
    "person@example.com",
    "8.8.8.8",
    new Headers({
      "x-coss-device": "x".repeat(4097),
      "user-agent": "test browser",
    }),
  );
  expect(params.ip).toBe("8.8.8.8");
  expect(params.user_agent).toBe("test browser");
  expect(params.device).toBeUndefined();
});

test("an invalid IP does not remove a valid device token", () => {
  const params = signUpRiskParams(
    "person@example.com",
    "invalid",
    new Headers({
      "x-coss-device": "token",
    }),
  );
  expect(params.ip).toBeUndefined();
  expect(params.device).toEqual({ token: "token" });
});
