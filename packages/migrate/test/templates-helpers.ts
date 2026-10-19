import { expect } from "bun:test";
import { checkTemplateContents, type TemplateVariable } from "@coss/email/templates";
import type { ConvertedTemplate } from "../src/templates/index.ts";

/** Problems coss.com would refuse publishing for. */
export function publishProblems(result: ConvertedTemplate) {
  return checkTemplateContents(
    [{ locale: "en", subject: result.subject, html: result.html, text: result.text }],
    result.variables as TemplateVariable[],
  );
}

/** A lossless conversion must publish; anything else must say why it isn't. */
export function expectConsistent(result: ConvertedTemplate): void {
  if (result.lossless) {
    expect(publishProblems(result)).toEqual([]);
  } else {
    expect(result.warnings.length + publishProblems(result).length).toBeGreaterThan(0);
  }
}

export function messages(result: ConvertedTemplate): string[] {
  return result.warnings.map((warning) => warning.message);
}
