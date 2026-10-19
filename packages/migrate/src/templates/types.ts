/**
 * What the template converters produce: coss.com template content (`@coss/email/templates`) plus
 * what the conversion changed. Client-safe (no database), like the template language itself.
 */
import type { TemplateField, TemplateVariableType } from "@coss/email/templates";

/** A declared variable, in the shape `CreateEmailTemplateRequest.variables` takes. */
export type ConvertedVariable = {
  name: string;
  type: TemplateVariableType;
  required: boolean;
  default?: string | number | boolean | undefined;
  description?: string | undefined;
  fields?: { name: string; type: "string" | "number" | "boolean"; required: boolean }[] | undefined;
};

/** Something the converter couldn't carry over exactly, at a 1-based line and column of its output. */
export type ConversionWarning = {
  field: TemplateField;
  line: number;
  column: number;
  message: string;
};

/** A name the converter had to change (dot paths are flattened: `user.name` → `user_name`). */
export type VariableRename = { from: string; to: string };

export type ConvertedTemplate = {
  /** Never empty: a template without one gets a placeholder and a warning. */
  subject: string;
  html: string | null;
  text: string | null;
  variables: ConvertedVariable[];
  /** Example values (from the provider's test data), keyed by the converted names. */
  sampleVariables: Record<string, unknown> | null;
  renames: VariableRename[];
  warnings: ConversionWarning[];
  /**
   * True when the converted template sends what the original did (renames aside, which callers
   * are told about): only then is it published; anything else is imported as a draft.
   */
  lossless: boolean;
};
