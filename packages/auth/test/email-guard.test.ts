import { describe, expect, test } from "bun:test";
import { signUpEmailRejection } from "../src/email-guard.ts";

describe("signUpEmailRejection", () => {
  const deliverable = async () => "deliverable" as const;
  const undeliverable = async () => "undeliverable" as const;

  test("refuses disposable addresses without a DNS lookup", async () => {
    const rejection = await signUpEmailRejection("x@inbox.mailinator.com", {
      checkDomain: () => {
        throw new Error("no lookup expected");
      },
      production: true,
    });
    expect(rejection?.code).toBe("DISPOSABLE_EMAIL");
  });

  test("refuses domains that can't receive mail, allows the rest", async () => {
    const opts = { production: true };
    expect(
      (await signUpEmailRejection("x@acme.io", { ...opts, checkDomain: undeliverable }))?.code,
    ).toBe("EMAIL_DOMAIN_UNDELIVERABLE");
    expect(
      await signUpEmailRejection("x@acme.io", { ...opts, checkDomain: deliverable }),
    ).toBeNull();
    expect(
      await signUpEmailRejection("x@acme.io", { ...opts, checkDomain: async () => "unknown" }),
    ).toBeNull();
  });

  test("special-use TLDs: allowed in development, refused in production", async () => {
    expect(
      await signUpEmailRejection("x@coss.test", { production: false, checkDomain: undeliverable }),
    ).toBeNull();
    expect(
      (await signUpEmailRejection("x@coss.local", { production: true, checkDomain: deliverable }))
        ?.code,
    ).toBe("EMAIL_DOMAIN_UNDELIVERABLE");
  });
});
