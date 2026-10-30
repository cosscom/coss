import { describe, expect, test } from "bun:test";
import {
  needsSenderRegistration,
  registerAgainHref,
  registerSenderHref,
} from "../src/lib/sms-registration";

const local = { id: "num_local", kind: "local", status: "active", providerSid: "PN1" } as const;
const tollFree = { id: "num_tf", kind: "toll_free", status: "active", providerSid: "PN2" } as const;

describe("registerSenderHref", () => {
  test("an unregistered local number registers the organization for 10DLC", () => {
    expect(registerSenderHref("acme", local, null)).toBe("/acme/sms/register?kind=us_10dlc");
  });

  test("an unregistered toll-free number is verified on its own", () => {
    expect(registerSenderHref("acme", tollFree, null)).toBe("/acme/sms/register?number=num_tf");
  });

  test("rejected and failed registrations can be submitted again", () => {
    expect(registerSenderHref("acme", local, "rejected")).not.toBeNull();
    expect(registerSenderHref("acme", tollFree, "failed")).not.toBeNull();
  });

  test("nothing to register while a registration is under way or approved", () => {
    for (const status of ["submitted", "in_review", "approved"] as const) {
      expect(registerSenderHref("acme", local, status)).toBeNull();
      expect(registerSenderHref("acme", tollFree, status)).toBeNull();
    }
  });

  test("a toll-free purchase that hasn't settled can't be verified yet, a local one still registers", () => {
    expect(
      registerSenderHref("acme", { ...tollFree, status: "pending", providerSid: null }, null),
    ).toBeNull();
    expect(
      needsSenderRegistration({ ...tollFree, status: "pending", providerSid: null }, null),
    ).toBe(true);
    expect(
      registerSenderHref("acme", { ...local, status: "pending", providerSid: null }, null),
    ).toBe("/acme/sms/register?kind=us_10dlc");
  });

  test("a number being released needs nothing", () => {
    expect(needsSenderRegistration({ ...local, status: "releasing" }, null)).toBe(false);
    expect(registerSenderHref("acme", { ...tollFree, status: "releasing" }, null)).toBeNull();
  });
});

describe("registerAgainHref", () => {
  test("a refused registration is retried for the same sender", () => {
    expect(registerAgainHref("acme", { kind: "toll_free", numberId: "num_tf" })).toBe(
      "/acme/sms/register?number=num_tf",
    );
    expect(registerAgainHref("acme", { kind: "us_10dlc", numberId: null })).toBe(
      "/acme/sms/register?kind=us_10dlc",
    );
  });
});
