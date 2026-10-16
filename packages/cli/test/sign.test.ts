import { describe, expect, test } from "bun:test";
import { verifyWebhook } from "coss";
import { challengeFor, verificationCode } from "../src/auth/pkce.ts";
import { generateSecret, isSecret, sign, signatureHeaders } from "../src/listen/sign.ts";

describe("signing", () => {
  test("forwarded events verify with the SDK's verifyWebhook", async () => {
    const secret = generateSecret();
    expect(isSecret(secret)).toBe(true);
    const body = JSON.stringify({
      id: "evt_1",
      object: "event",
      type: "email.delivered",
      data: {},
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const headers = signatureHeaders({ secret, id: "evt_1", timestamp, body });
    expect(await verifyWebhook(body, headers, secret)).toMatchObject({ id: "evt_1" });
    expect(verifyWebhook(`${body} `, headers, secret)).rejects.toThrow();
  });

  test("matches the Standard Webhooks test vector", () => {
    // https://github.com/standard-webhooks/standard-webhooks (libraries' shared test case).
    expect(
      sign(
        "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
        "msg_p5jXN8AQM9LWM0D4loKWxJek",
        1614265330,
        '{"test": 2432232314}',
      ),
    ).toBe("v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=");
  });
});

describe("PKCE", () => {
  test("S256 matches RFC 7636's example; the verification code is stable", () => {
    expect(challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
    // The approval page shows the same code (packages/tenancy/test/cli-auth.test.ts pins it too).
    expect(verificationCode("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")).toBe("DZ93-GPCX");
  });
});
