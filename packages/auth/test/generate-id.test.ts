import { expect, test } from "bun:test";
import { isId } from "@coss/db/id";
import { generateAuthId } from "../src/options.ts";

test("Better Auth models get TypeID prefixes", () => {
  expect(isId("key", generateAuthId({ model: "apikey" }))).toBe(true);
  expect(isId("org", generateAuthId({ model: "organization" }))).toBe(true);
  expect(isId("invite", generateAuthId({ model: "invitation" }))).toBe(true);
  expect(isId("user", generateAuthId({ model: "user" }))).toBe(true);
  expect(isId("tfa", generateAuthId({ model: "twoFactor" }))).toBe(true);
  expect(isId("passkey", generateAuthId({ model: "passkey" }))).toBe(true);
  expect(isId("ssop", generateAuthId({ model: "ssoProvider" }))).toBe(true);
  expect(isId("id", generateAuthId({ model: "somethingNew" }))).toBe(true);
});
