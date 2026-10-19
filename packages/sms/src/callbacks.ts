/**
 * The provider's callbacks (the API's public `/sms/twilio/*` routes): verified with the
 * subaccount's auth token, then recorded. System-level: the organization is the one whose
 * subaccount the callback names, and what it reports must be that organization's.
 */
import { db, schema } from "@coss/db";
import { decryptSecret, type SecretsKeyRing } from "@coss/webhooks";
import { and, eq } from "drizzle-orm";
import { recordSmsEvent } from "./events.ts";
import { type ReceiveSmsResult, receiveSms } from "./received.ts";
import { inboundMessage, statusCallbackEvent, TWILIO_PROVIDER } from "./twilio/callbacks.ts";
import { verifyTwilioSignature } from "./twilio/signature.ts";

const { smsAccount, smsMessage } = schema;

export type CallbackRequest = {
  /** The public URL Twilio called (built from `API_PUBLIC_URL`, query string included). */
  url: string;
  params: Record<string, string>;
  signature: string | null;
};

export type CallbackOutcome =
  /** Unknown subaccount: nothing to verify against. */
  | { status: "unknown_account" }
  | { status: "invalid_signature" }
  | { status: "recorded" }
  | { status: "ignored" }
  | { status: "received"; result: ReceiveSmsResult };

async function verifiedAccount(
  request: CallbackRequest,
  keys: SecretsKeyRing,
): Promise<{ organizationId: string } | CallbackOutcome> {
  const accountSid = request.params.AccountSid;
  const [account] = accountSid
    ? await db
        .select({ organizationId: smsAccount.organizationId, authToken: smsAccount.authToken })
        .from(smsAccount)
        .where(
          and(eq(smsAccount.subaccountSid, accountSid), eq(smsAccount.provider, TWILIO_PROVIDER)),
        )
        .limit(1)
    : [];
  if (!account?.authToken) return { status: "unknown_account" };
  const valid = verifyTwilioSignature({
    authToken: decryptSecret(account.authToken, keys),
    url: request.url,
    params: request.params,
    signature: request.signature,
  });
  return valid ? { organizationId: account.organizationId } : { status: "invalid_signature" };
}

/** A status callback (`?sms_id=` names the message coss.com sent). */
export async function handleStatusCallback(
  request: CallbackRequest & { smsId: string },
  keys: SecretsKeyRing,
): Promise<CallbackOutcome> {
  const account = await verifiedAccount(request, keys);
  if ("status" in account) return account;
  const event = statusCallbackEvent(request.smsId, request.params);
  if (!event) return { status: "ignored" };
  return db.transaction(async (tx) => {
    const [message] = await tx
      .select({ id: smsMessage.id })
      .from(smsMessage)
      .where(
        and(
          eq(smsMessage.id, request.smsId),
          eq(smsMessage.organizationId, account.organizationId),
        ),
      )
      .limit(1);
    if (!message) return { status: "ignored" } as const;
    const rows = await recordSmsEvent(tx, event);
    return { status: rows.length > 0 ? "recorded" : "ignored" } as const;
  });
}

/** An inbound message to one of the subaccount's numbers. */
export async function handleInboundCallback(
  request: CallbackRequest,
  keys: SecretsKeyRing,
): Promise<CallbackOutcome> {
  const account = await verifiedAccount(request, keys);
  if ("status" in account) return account;
  const inbound = inboundMessage(request.params);
  if (!inbound) return { status: "ignored" };
  return {
    status: "received",
    result: await receiveSms(inbound, { organizationId: account.organizationId }),
  };
}
