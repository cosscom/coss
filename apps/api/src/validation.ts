/** Turns zod validation failures from route validators into the public 422 envelope. */
import type { ValidationTargets } from "hono";
import type { ZodError } from "zod";
import { ApiError, type ApiErrorIssue } from "./errors.ts";

export type ValidationResult = { target: keyof ValidationTargets } & (
  | { success: true }
  | { success: false; error: ZodError }
);

const TARGET_LABEL: Record<keyof ValidationTargets, string> = {
  json: "request body",
  form: "request body",
  query: "query parameters",
  param: "path parameters",
  header: "request headers",
  cookie: "cookies",
};

export function toIssues(error: ZodError): ApiErrorIssue[] {
  return error.issues.flatMap((issue) => {
    const path = issue.path.map(String);
    // Strict objects report unknown fields once at the parent; one issue per field is clearer.
    if (issue.code === "unrecognized_keys") {
      return issue.keys.map((key) => ({
        path: [...path, key].join("."),
        message: `Unrecognized field "${key}".`,
      }));
    }
    return [{ path: path.join("."), message: issue.message }];
  });
}

function summarize(target: keyof ValidationTargets, issues: ApiErrorIssue[]): string {
  const [first] = issues;
  if (!first) return `Invalid ${TARGET_LABEL[target]}.`;
  const where = first.path ? `\`${first.path}\`: ` : "";
  const rest = issues.length - 1;
  const more = rest > 0 ? ` (and ${rest} more ${rest === 1 ? "issue" : "issues"})` : "";
  return `Invalid ${TARGET_LABEL[target]}: ${where}${first.message}${more}`;
}

export function validationError(target: keyof ValidationTargets, error: ZodError): ApiError {
  const issues = toIssues(error);
  const param = issues[0]?.path;
  return new ApiError(422, {
    type: "invalid_request_error",
    code: "validation_error",
    message: summarize(target, issues),
    ...(param ? { param } : {}),
    issues,
  });
}

/** The root `defaultHook`: lets valid input through and throws the 422 envelope otherwise. */
export function validationHook(result: ValidationResult): void {
  if (!result.success) throw validationError(result.target, result.error);
}
