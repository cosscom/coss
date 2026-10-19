/**
 * Converters from other providers' template languages to coss.com's (`@coss/email/templates`).
 * Client-safe: no database, no Node APIs (the dashboard can preview a conversion).
 */
export { convertSendGridTemplate, type SendGridTemplateInput } from "./handlebars.ts";
export { convertPostmarkTemplate, type PostmarkTemplateInput } from "./mustachio.ts";
export {
  convertResendTemplate,
  type ResendTemplateInput,
  type ResendTemplateVariable,
} from "./resend.ts";
export type {
  ConversionWarning,
  ConvertedTemplate,
  ConvertedVariable,
  VariableRename,
} from "./types.ts";
