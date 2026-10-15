import { afterEach, describe, expect, test } from "bun:test";
import { auth } from "@coss/auth";
import {
  DEVICE_TOKEN_HEADER,
  type SignUpRiskAssessor,
  type SignUpRiskInput,
  setSignUpRiskAssessor,
} from "@coss/auth/risk";
import { uniqueSuffix } from "@coss/db/testing";

afterEach(() => setSignUpRiskAssessor(null));

function signUp(headers?: Headers) {
  const email = `risk-${uniqueSuffix()}@coss.test`;
  return {
    email,
    result: auth.api.signUpEmail({
      body: { email, password: `pw-${uniqueSuffix()}-not-secret`, name: "New User" },
      headers,
    }),
  };
}

function assessor(
  answer: Awaited<ReturnType<SignUpRiskAssessor>> | Error | "hang",
): SignUpRiskAssessor & { calls: SignUpRiskInput[] } {
  const calls: SignUpRiskInput[] = [];
  const assess = async (input: SignUpRiskInput) => {
    calls.push(input);
    if (answer instanceof Error) throw answer;
    if (answer === "hang") return new Promise<never>(() => {});
    return answer;
  };
  return Object.assign(assess, { calls });
}

describe("COSS Risk on sign-up", () => {
  test("a block refuses the sign-up without saying why; the request reaches the assessor", async () => {
    const assess = assessor({ decision: "block", assessmentId: "rsk_x" });
    setSignUpRiskAssessor(assess);
    const headers = new Headers({ [DEVICE_TOKEN_HEADER]: "cd1.token", "user-agent": "Test" });
    const { email, result } = signUp(headers);
    await expect(result).rejects.toMatchObject({
      body: { code: "SIGN_UP_REFUSED" },
    });
    expect(assess.calls).toHaveLength(1);
    expect(assess.calls[0]?.email).toBe(email);
    expect(assess.calls[0]?.headers?.get(DEVICE_TOKEN_HEADER)).toBe("cd1.token");
  });

  test("allow and review go ahead", async () => {
    for (const decision of ["allow", "review"] as const) {
      setSignUpRiskAssessor(assessor({ decision, assessmentId: "rsk_x" }));
      const { email, result } = signUp();
      expect((await result).user.email).toBe(email);
    }
  });

  test("fails open: no assessor, an error, no verdict", async () => {
    expect((await signUp().result).user).toBeDefined();
    setSignUpRiskAssessor(assessor(new Error("Valkey down")));
    expect((await signUp().result).user).toBeDefined();
    setSignUpRiskAssessor(assessor(null));
    expect((await signUp().result).user).toBeDefined();
  });

  test("a slow assessment doesn't hold the sign-up past its budget", async () => {
    setSignUpRiskAssessor(assessor("hang"));
    const started = Date.now();
    expect((await signUp().result).user).toBeDefined();
    expect(Date.now() - started).toBeLessThan(5000);
  }, 10_000);
});
