/**
 * Compile-time contract between the API's zod schemas and the SDK's hand-written wire types.
 * Checked by `tsc --noEmit` (never executed): a mismatch is a type error in this file.
 */
import type { EmailObject, SendEmailRequest } from "@coss/email/schemas";
import type { CossErrorIssue, CossErrorType, Email, SendEmailParams } from "coss";
import type { z } from "zod";
import type { ErrorEnvelopeBody } from "../src/errors.ts";

/** Identical types (stricter than mutual assignability: also catches optionality drift). */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/** Each side assignable to the other, with exactly the same keys. */
type MutuallyAssignable<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? Equals<keyof A, keyof B>
    : false
  : false;

type Assert<T extends true> = T;

type SendInput = z.input<typeof SendEmailRequest>;
type EmailOutput = z.output<typeof EmailObject>;
type ApiError = ErrorEnvelopeBody["error"];

export type Contract = [
  // Request: anything the SDK accepts is what the API validates, and vice versa.
  Assert<MutuallyAssignable<SendInput, SendEmailParams>>,
  Assert<Equals<keyof SendInput, keyof SendEmailParams>>,
  Assert<MutuallyAssignable<SendInput["to"], SendEmailParams["to"]>>,
  Assert<MutuallyAssignable<NonNullable<SendInput["tags"]>, NonNullable<SendEmailParams["tags"]>>>,
  // Response: what the API returns is exactly the SDK's `Email`.
  Assert<MutuallyAssignable<EmailOutput, Email>>,
  Assert<MutuallyAssignable<EmailOutput["status"], Email["status"]>>,
  Assert<MutuallyAssignable<EmailOutput["tags"], Email["tags"]>>,
  // Errors: every API error type is one the SDK knows, and issues have the same shape.
  Assert<ApiError["type"] extends CossErrorType ? true : false>,
  Assert<MutuallyAssignable<NonNullable<ApiError["issues"]>[number], CossErrorIssue>>,
];
