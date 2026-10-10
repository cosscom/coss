export { EmailError, type EmailErrorCode } from "./errors.ts";
export type { EmailProvider, OutboundEmail } from "./provider.ts";
export { FakeEmailProvider } from "./providers/fake.ts";
export { type EmailRow, getEmail, listEmails, toEmailObject } from "./read.ts";
export {
  EMAIL_STATUSES,
  EmailObject,
  type EmailObjectOutput,
  emailAddressProblem,
  isReservedHeader,
  MAX_HEADERS,
  MAX_RECIPIENTS,
  MAX_TAGS,
  type ParsedEmailAddress,
  parseEmailAddress,
  RESERVED_HEADERS,
  SendEmailRequest,
  type SendEmailRequestInput,
  type SendEmailRequestOutput,
  SUBJECT_MAX_LENGTH,
} from "./schemas.ts";
export {
  createEmailService,
  type EmailService,
  IDEMPOTENCY_KEY_TTL_MS,
  type SendEmailInput,
  type SendEnvironment,
} from "./service.ts";
