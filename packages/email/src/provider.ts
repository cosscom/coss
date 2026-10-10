/** A message ready for a delivery provider (internal, camelCase). */
export type OutboundEmail = {
  emailId: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  replyTo: string[];
  subject: string;
  html: string | null;
  text: string | null;
  headers: Record<string, string>;
  tags: { name: string; value: string }[];
};

/**
 * Delivery seam (fake today, SES next). `send` resolves once the provider accepted the message
 * and throws when it did not; the service records either outcome on the email row.
 */
export interface EmailProvider {
  readonly name: string;
  send(message: OutboundEmail): Promise<{ providerMessageId: string }>;
}
