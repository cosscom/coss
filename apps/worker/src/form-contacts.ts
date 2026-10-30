/**
 * Forms' contacts: an accepted submission's submitter becomes (or updates) a contact of the form's
 * environment (`source: form`), in its audiences and opted into its topics. With double opt-in
 * (the form's choice, else the environment's marketing settings) a new or unsubscribed contact is
 * `pending` and gets the environment's confirmation email, charged like the API's: the
 * organization's confirmation limits, the address's across every organization, and the send quota.
 */
import type { PlanGate } from "@coss/billing/gate";
import {
  type EmailService,
  getMarketingSettingsRow,
  type LinkKeyRing,
  listContactPropertyRows,
  sendConfirmation,
  upsertContact,
} from "@coss/email";
import { UpsertContactRequest } from "@coss/email/contact-schemas";
import type { FormContactInput, FormContactSink } from "@coss/forms";
import { emailSendQuota, type RateLimiter } from "@coss/ratelimit";

/** A submitted text as the property's type takes it; `undefined` when it doesn't fit (dropped). */
function propertyValue(type: string, text: string): string | number | boolean | undefined {
  switch (type) {
    case "number": {
      const number = Number(text);
      return text.trim() !== "" && Number.isFinite(number) ? number : undefined;
    }
    case "boolean": {
      const value = text.trim().toLowerCase();
      if (["true", "on", "yes", "1"].includes(value)) return true;
      if (["false", "off", "no", "0"].includes(value)) return false;
      return undefined;
    }
    case "date":
      return Number.isNaN(Date.parse(text)) ? undefined : text;
    default:
      return text;
  }
}

export function formContactSink(opts: {
  emailService: Pick<EmailService, "send">;
  limiter: RateLimiter;
  linkKeys: LinkKeyRing;
  /** Where confirmation links point (the tracking host). */
  linkBaseUrl: string;
  plans?: PlanGate;
}): FormContactSink {
  /** Sends the confirmation within the limits, giving every charge back unless it was sent. */
  async function confirm(input: FormContactInput, contactId: string): Promise<void> {
    const { environment } = input;
    const org = {
      buckets: ["contacts.confirmations.second", "contacts.confirmations.day"] as (
        | "contacts.confirmations.second"
        | "contacts.confirmations.day"
      )[],
      subject: environment.organizationId,
      organizationId: environment.organizationId,
    };
    const byAddress = {
      buckets: ["contacts.confirmation.address"] as "contacts.confirmation.address"[],
      subject: input.email,
    };
    if (!(await opts.limiter.consume(org)).allowed) {
      // Retried with the delivery's backoff.
      throw new Error("The organization's confirmation emails are rate limited.");
    }
    if (!(await opts.limiter.consume(byAddress)).allowed) {
      await opts.limiter.refund(org);
      return;
    }
    const quota = emailSendQuota(environment, 1);
    if (!(await opts.limiter.consume(quota)).allowed) {
      await Promise.all([opts.limiter.refund(org), opts.limiter.refund(byAddress)]);
      throw new Error("The organization's send quota is used up.");
    }
    let sent = false;
    try {
      sent =
        (await sendConfirmation({
          environment,
          contactId,
          emailService: opts.emailService,
          apiKeyId: null,
          linkKeys: opts.linkKeys,
          baseUrl: opts.linkBaseUrl,
        })) === "sent";
    } finally {
      if (!sent) {
        await Promise.all([
          opts.limiter.refund(org),
          opts.limiter.refund(byAddress),
          opts.limiter.refund(quota),
        ]);
      }
    }
  }

  return {
    async add(input) {
      const env = {
        organizationId: input.environment.organizationId,
        environmentId: input.environment.environmentId,
      };
      const doubleOptIn =
        input.doubleOptIn ?? (await getMarketingSettingsRow(env))?.doubleOptInDefault ?? false;
      const definitions = new Map(
        (await listContactPropertyRows(env)).map((row) => [row.key, row.type]),
      );
      const properties: Record<string, string | number | boolean> = {};
      for (const [key, text] of Object.entries(input.properties)) {
        const type = definitions.get(key);
        const value = type ? propertyValue(type, text) : undefined;
        if (value !== undefined) properties[key] = value;
      }
      const params = UpsertContactRequest.parse({
        email: input.email,
        ...(input.firstName ? { first_name: input.firstName.slice(0, 100) } : {}),
        ...(input.lastName ? { last_name: input.lastName.slice(0, 100) } : {}),
        ...(Object.keys(properties).length > 0 ? { properties } : {}),
        ...(input.audienceIds.length > 0 ? { audience_ids: input.audienceIds } : {}),
        ...(input.topics.length > 0
          ? { topics: input.topics.map((topic) => ({ topic, status: "opted_in" })) }
          : {}),
      });
      const result = await upsertContact(env, params, {
        source: "form",
        plans: opts.plans,
        doubleOptIn,
      });
      if (doubleOptIn && result.pending) await confirm(input, result.contact.id);
    },
  };
}
