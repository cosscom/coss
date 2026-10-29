/** Environment shape of Verify (zod only, client-safe). */
import { z } from "zod";

const E164 = /^\+[1-9]\d{6,14}$/;

/**
 * coss.com's shared numbers: a live environment of coss.com's own organization (the one
 * `NOTIFICATIONS_ENVIRONMENT_ID` belongs to) and the numbers there, comma-separated E.164, each an
 * approved sender registered for one-time codes. Both or neither; unset → live SMS codes need the
 * environment's own number.
 */
export const verifyEnvShape = {
  VERIFY_SMS_ENVIRONMENT_ID: z.string().startsWith("env_").optional(),
  VERIFY_SMS_FROM: z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (value === undefined) return undefined;
      const numbers = value
        .split(",")
        .map((number) => number.trim())
        .filter(Boolean);
      for (const number of numbers) {
        if (!E164.test(number)) {
          ctx.addIssue({ code: "custom", message: `${number} isn't an E.164 number.` });
          return z.NEVER;
        }
      }
      return numbers;
    }),
};
