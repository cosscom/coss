/**
 * coss.com's own sign-ups go through coss.com Risk (dogfooding): the dashboard registers an assessor that
 * calls `assessRisk` in coss.com's own environment. `@coss/auth` can't depend on risk (risk's tests
 * use tenancy, which depends on auth), so the app injects it, like the membership limit.
 *
 * Fails open: without an assessor, or when it throws or takes longer than `TIMEOUT_MS`, the
 * sign-up goes ahead (the sign-up email guard and Turnstile still apply). Only `block` refuses;
 * `review` decisions wait in coss.com's own review queue.
 */
import { APIError } from "better-auth/api";

export { DEVICE_TOKEN_HEADER } from "./constants.ts";

/** A sign-up as the assessor sees it: the address and the request (client IP, user agent). */
export type SignUpRiskInput = { email: string; headers: Headers | null };

export type SignUpRiskVerdict = { decision: "allow" | "review" | "block"; assessmentId: string };

export type SignUpRiskAssessor = (input: SignUpRiskInput) => Promise<SignUpRiskVerdict | null>;

const TIMEOUT_MS = 3000;

export const SIGN_UP_REFUSED = {
  code: "SIGN_UP_REFUSED",
  message:
    "We couldn't create an account with these details. If you think this is a mistake, contact support@coss.com.",
} as const;

let assessor: SignUpRiskAssessor | null = null;

/** Called once by the app that serves `/api/auth` (the dashboard). */
export function setSignUpRiskAssessor(next: SignUpRiskAssessor | null): void {
  assessor = next;
}

/** The decision for a sign-up, or `null` when there is none (no assessor, failure, timeout). */
export async function signUpRiskVerdict(input: SignUpRiskInput): Promise<SignUpRiskVerdict | null> {
  if (!assessor) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      assessor(input),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    console.warn(
      "[auth] Sign-up risk assessment failed:",
      error instanceof Error ? error.message : error,
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Refuses a sign-up Risk blocks, without saying why (reasons are an oracle for attackers). */
export async function assertSignUpNotBlocked(input: SignUpRiskInput): Promise<void> {
  const verdict = await signUpRiskVerdict(input);
  if (verdict?.decision === "block") throw new APIError("FORBIDDEN", { ...SIGN_UP_REFUSED });
}
