import { describe, expect, test } from "bun:test";
import { isId, newId } from "@coss/db/id";
import {
  emailDomainOf,
  parseSsoDomains,
  ssoProviderIdFor,
  ssoProviderIdOfPath,
} from "../src/sso.ts";

describe("SSO helpers", () => {
  test("ssoProviderIdFor derives a stable TypeID from the organization id", () => {
    const orgId = newId("org");
    const providerId = ssoProviderIdFor(orgId);
    expect(isId("sso", providerId)).toBe(true);
    expect(providerId.slice(4)).toBe(orgId.slice(4));
    expect(ssoProviderIdFor(orgId)).toBe(providerId);
  });

  test("parseSsoDomains splits, trims, lower-cases and dedupes", () => {
    expect(parseSsoDomains(" Acme.com, acme.io ,,acme.com")).toEqual(["acme.com", "acme.io"]);
  });

  test("emailDomainOf takes the part after the last @", () => {
    expect(emailDomainOf("Ada@Acme.COM")).toBe("acme.com");
    expect(emailDomainOf("no-domain")).toBeNull();
    expect(emailDomainOf("trailing@")).toBeNull();
  });

  test("ssoProviderIdOfPath only matches the OIDC callback and the SAML ACS", () => {
    const params = { providerId: "sso_x" };
    expect(ssoProviderIdOfPath("/sso/callback/:providerId", params)).toBe("sso_x");
    expect(ssoProviderIdOfPath("/sso/saml2/sp/acs/:providerId", params)).toBe("sso_x");
    expect(ssoProviderIdOfPath("/sso/callback/sso_x", params)).toBe("sso_x");
    expect(ssoProviderIdOfPath("/sign-in/email", params)).toBeNull();
    expect(ssoProviderIdOfPath("/sso/saml2/sp/slo/:providerId", params)).toBeNull();
    expect(ssoProviderIdOfPath("/sso/callback/:providerId", undefined)).toBeNull();
    expect(ssoProviderIdOfPath(undefined, params)).toBeNull();
  });
});
