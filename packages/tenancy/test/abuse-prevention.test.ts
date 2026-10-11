import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";
import { auth } from "@coss/auth";
import { authOptions, MAX_OWNED_ORGANIZATIONS } from "@coss/auth/options";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { betterAuth } from "better-auth";
import { captcha } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { addMember, createTestTenant, createTestUser } from "../src/testing.ts";

const BASE_URL = "http://localhost:3000";

/** Signs in and returns request headers carrying the session cookie. */
async function sessionHeaders(email: string, password: string): Promise<Headers> {
  const { headers } = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

/** POSTs a JSON body to a Better Auth HTTP endpoint, the way the dashboard's client does. */
function post(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
  handler: (request: Request) => Promise<Response> = auth.handler,
): Promise<Response> {
  return handler(
    new Request(`${BASE_URL}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE_URL, ...headers },
      body: JSON.stringify(body),
    }),
  );
}

function signUpBody(email: string) {
  return { name: "Abuse Test", email, password: `pw-${uniqueSuffix()}-not-secret` };
}

// Sign-up sends a (console-logged) verification email.
let info: ReturnType<typeof spyOn>;
beforeEach(() => {
  info = spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  info.mockRestore();
});

describe("sign-up email guard", () => {
  test("refuses disposable addresses", async () => {
    const response = await post("/sign-up/email", signUpBody(`x-${uniqueSuffix()}@mailinator.com`));
    expect(response.status).toBe(400);
    expect(((await response.json()) as { code: string }).code).toBe("DISPOSABLE_EMAIL");
  });

  test("stores the canonical address and refuses a second account for the same mailbox", async () => {
    const local = `ada.${uniqueSuffix()}`;
    const first = await post("/sign-up/email", signUpBody(`${local}@coss.test`));
    expect(first.status).toBe(200);
    const [user] = await db
      .select({ canonicalEmail: schema.user.canonicalEmail })
      .from(schema.user)
      .where(eq(schema.user.email, `${local}@coss.test`));
    expect(user?.canonicalEmail).toBe(`${local}@coss.test`);

    // Upper-casing is folded for every domain (Better Auth lower-cases emails too).
    const again = await post("/sign-up/email", signUpBody(`${local.toUpperCase()}@COSS.test`));
    expect(again.status).toBe(422);
  });

  test("folds Gmail dots and +tags", async () => {
    const suffix = uniqueSuffix().replaceAll(/[^a-z0-9]/gi, "");
    // An existing user, created server-side (no DNS check), whose mailbox is taken.
    await auth.api.createUser({
      body: { email: `ada${suffix}@gmail.com`, password: `pw-${suffix}-not-secret`, name: "Ada" },
    });
    const response = await post("/sign-up/email", signUpBody(`a.d.a${suffix}+coss@googlemail.com`));
    expect(response.status).toBe(422);
    expect(((await response.json()) as { code: string }).code).toBe(
      "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
    );
  });
});

describe("invitations", () => {
  async function invite(tenant: Awaited<ReturnType<typeof createTestTenant>>, email: string) {
    return auth.api.createInvitation({
      headers: await sessionHeaders(tenant.owner.email, tenant.owner.password),
      body: { email, role: "member", organizationId: tenant.organization.id },
    });
  }

  test("can't be sent to disposable addresses", async () => {
    const tenant = await createTestTenant();
    await expect(invite(tenant, `x-${uniqueSuffix()}@mailinator.com`)).rejects.toThrow(
      /Disposable/,
    );
  });

  test("need an inviter with a verified email", async () => {
    const tenant = await createTestTenant({ emailVerified: false });
    await expect(invite(tenant, `x-${uniqueSuffix()}@coss.test`)).rejects.toThrow(/Verify/);
  });

  test("the HTTP endpoint is disabled (the dashboard's action rate-limits invitations)", async () => {
    const tenant = await createTestTenant();
    const cookie = (await sessionHeaders(tenant.owner.email, tenant.owner.password)).get("cookie");
    const response = await post(
      "/organization/invite-member",
      {
        email: `x-${uniqueSuffix()}@coss.test`,
        role: "member",
        organizationId: tenant.organization.id,
      },
      { cookie: cookie ?? "" },
    );
    expect(response.status).toBe(404);
  });
});

describe("organization limit", () => {
  test(`a user owns at most ${MAX_OWNED_ORGANIZATIONS} organizations; memberships don't count`, async () => {
    const user = await createTestUser();
    // Being a member of other organizations doesn't use up the allowance.
    for (const role of ["admin", "member"] as const) {
      const other = await createTestTenant();
      await addMember({ organizationId: other.organization.id, userId: user.id, role });
    }
    const create = () => {
      const suffix = uniqueSuffix();
      return auth.api.createOrganization({
        body: { name: `Limit ${suffix}`, slug: `limit-${suffix}`, userId: user.id },
      });
    };
    for (let i = 0; i < MAX_OWNED_ORGANIZATIONS; i++) await create();
    await expect(create()).rejects.toThrow(/maximum number of organizations/);
  });

  test("platform admins are exempt", async () => {
    const admin = await createTestUser();
    await db.update(schema.user).set({ role: "admin" }).where(eq(schema.user.id, admin.id));
    for (let i = 0; i <= MAX_OWNED_ORGANIZATIONS; i++) {
      const suffix = uniqueSuffix();
      await auth.api.createOrganization({
        body: { name: `Admin ${suffix}`, slug: `admin-${suffix}`, userId: admin.id },
      });
    }
  });
});

describe("Turnstile (captcha plugin)", () => {
  // A local stand-in for Cloudflare's siteverify: "pass" tokens succeed on the dashboard's host.
  let siteverify: ReturnType<typeof Bun.serve>;
  let captchaAuth: ReturnType<typeof createCaptchaAuth>;

  function createCaptchaAuth(siteVerifyURL: string) {
    return betterAuth({
      ...authOptions,
      baseURL: BASE_URL,
      plugins: [
        ...authOptions.plugins,
        captcha({
          provider: "cloudflare-turnstile",
          secretKey: "test-secret",
          allowedHostnames: ["localhost"],
          siteVerifyURLOverride: siteVerifyURL,
        }),
      ],
    });
  }

  beforeAll(() => {
    siteverify = Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      async fetch(request) {
        const { response } = (await request.json()) as { response: string };
        return Response.json(
          response === "pass"
            ? { success: true, hostname: "localhost", action: "sign-up" }
            : response === "elsewhere"
              ? { success: true, hostname: "evil.example" }
              : { success: false, "error-codes": ["invalid-input-response"] },
        );
      },
    });
    captchaAuth = createCaptchaAuth(`http://127.0.0.1:${siteverify.port}/siteverify`);
  });

  afterAll(() => {
    siteverify.stop(true);
  });

  const signUp = (token?: string) =>
    post(
      "/sign-up/email",
      signUpBody(`turnstile-${uniqueSuffix()}@coss.test`),
      token ? { "x-captcha-response": token } : {},
      captchaAuth.handler,
    );

  test("refuses requests without a token", async () => {
    const response = await signUp();
    expect(response.status).toBe(400);
    expect(((await response.json()) as { code: string }).code).toBe("MISSING_RESPONSE");
  });

  test("refuses tokens Cloudflare rejects, or issued for another hostname", async () => {
    for (const token of ["fail", "elsewhere"]) {
      const response = await signUp(token);
      expect(response.status).toBe(403);
      expect(((await response.json()) as { code: string }).code).toBe("VERIFICATION_FAILED");
    }
  });

  test("lets verified requests through", async () => {
    expect((await signUp("pass")).status).toBe(200);
  });

  test("leaves server-side calls alone", async () => {
    const response = await captchaAuth.api.requestPasswordReset({
      body: { email: `nobody-${uniqueSuffix()}@coss.test`, redirectTo: "/reset-password" },
    });
    expect(response.status).toBe(true);
  });
});
