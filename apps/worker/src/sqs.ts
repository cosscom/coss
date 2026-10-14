/**
 * Consumes SES delivery events (SNS → SQS) and tenant status changes (EventBridge → SQS). A
 * message is deleted only after it was recorded; anything that fails stays in the queue, is
 * retried after the visibility timeout, and lands in the dead-letter queue after 5 receives.
 */
import { DeleteMessageBatchCommand, ReceiveMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { applyTenantStatus, ingestProviderEvents } from "@coss/email";
import { parseSesMessage } from "@coss/email/ses";

export type QueueMessage = { id: string; receiptHandle: string; body: string };

/** The SQS operations the consumer needs (tests use a fake). */
export interface SqsApi {
  receive(signal?: AbortSignal): Promise<QueueMessage[]>;
  delete(messages: QueueMessage[]): Promise<void>;
}

export const RECEIVE_BATCH = 10;

export function createSqsApi(region: string, queueUrl: string, label = "ses-events"): SqsApi {
  const client = new SQSClient({ region });
  return {
    async receive(signal) {
      const { Messages = [] } = await client.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: RECEIVE_BATCH,
          WaitTimeSeconds: 20,
        }),
        { abortSignal: signal },
      );
      return Messages.flatMap((message) =>
        message.MessageId && message.ReceiptHandle && message.Body !== undefined
          ? [{ id: message.MessageId, receiptHandle: message.ReceiptHandle, body: message.Body }]
          : [],
      );
    },
    async delete(messages) {
      if (messages.length === 0) return;
      const { Failed = [] } = await client.send(
        new DeleteMessageBatchCommand({
          QueueUrl: queueUrl,
          Entries: messages.map((m) => ({ Id: m.id, ReceiptHandle: m.receiptHandle })),
        }),
      );
      for (const failure of Failed) {
        console.error(`[worker:${label}] could not delete ${failure.Id}: ${failure.Message}`);
      }
    },
  };
}

/** Records one message; true when it can be deleted (recorded, duplicate or irrelevant). */
export async function handleSesMessage(body: string, tenantPrefix: string): Promise<boolean> {
  let parsed: ReturnType<typeof parseSesMessage>;
  try {
    parsed = parseSesMessage(body);
  } catch (error) {
    console.error("[worker:ses-events] unparseable message:", error);
    return false;
  }
  switch (parsed.kind) {
    case "events":
      await ingestProviderEvents(parsed.events);
      return true;
    case "tenant_status":
      await applyTenantStatus(parsed.status, tenantPrefix);
      return true;
    case "ignored":
      return true;
  }
}

/** One receive → record → delete round. Returns how many messages were received. */
export async function pollSesEvents(
  sqs: SqsApi,
  opts: { tenantPrefix: string; signal?: AbortSignal },
): Promise<number> {
  const messages = await sqs.receive(opts.signal);
  const done: QueueMessage[] = [];
  for (const message of messages) {
    try {
      if (await handleSesMessage(message.body, opts.tenantPrefix)) done.push(message);
    } catch (error) {
      console.error(`[worker:ses-events] recording ${message.id} failed:`, error);
    }
  }
  await sqs.delete(done);
  return messages.length;
}
