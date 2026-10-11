import { describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));
mock.module("@coss/email", () => ({
  DomainError: class extends Error {},
  EmailError: class extends Error {},
}));
mock.module("@coss/tenancy", () => ({ TenancyError: class extends Error {} }));
const { discoverOidcEndpoints, samlEntryPointFromMetadata, ssoUrls } = await import(
  "../src/lib/sso"
);

describe("ssoUrls", () => {
  test("serves everything under /api/auth on the dashboard origin", () => {
    expect(ssoUrls("https://coss.com/", "sso_x")).toEqual({
      oidcRedirectUri: "https://coss.com/api/auth/sso/callback/sso_x",
      samlAcsUrl: "https://coss.com/api/auth/sso/saml2/sp/acs/sso_x",
      samlEntityId: "https://coss.com/api/auth/sso/saml2/sp/metadata?providerId=sso_x",
      samlMetadataUrl: "https://coss.com/api/auth/sso/saml2/sp/metadata?providerId=sso_x",
    });
  });
});

describe("samlEntryPointFromMetadata", () => {
  const metadata = (services: string) =>
    `<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://idp.example.com"><md:IDPSSODescriptor>${services}</md:IDPSSODescriptor></md:EntityDescriptor>`;

  test("prefers the HTTP-Redirect binding", () => {
    expect(
      samlEntryPointFromMetadata(
        metadata(
          '<md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://idp.example.com/post"/>' +
            '<md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://idp.example.com/redirect"/>',
        ),
      ),
    ).toBe("https://idp.example.com/redirect");
  });

  test("falls back to the first service, and to null without a valid URL", () => {
    expect(
      samlEntryPointFromMetadata(
        metadata('<SingleSignOnService Location="https://idp.example.com/only" Binding="x"/>'),
      ),
    ).toBe("https://idp.example.com/only");
    expect(samlEntryPointFromMetadata(metadata(""))).toBeNull();
    expect(
      samlEntryPointFromMetadata(metadata('<md:SingleSignOnService Location="not a url"/>')),
    ).toBeNull();
  });
});

describe("discoverOidcEndpoints", () => {
  test("refuses non-https and private issuers before fetching anything", async () => {
    await expect(discoverOidcEndpoints("http://idp.example.com")).rejects.toThrow(
      "The issuer must be a public https:// URL.",
    );
    await expect(discoverOidcEndpoints("https://127.0.0.1")).rejects.toThrow(
      "The issuer must be a public https:// URL.",
    );
    await expect(discoverOidcEndpoints("https://169.254.169.254")).rejects.toThrow(
      "The issuer must be a public https:// URL.",
    );
  });
});
