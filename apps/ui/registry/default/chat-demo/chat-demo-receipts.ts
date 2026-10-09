import type { ChatMessage, ChatReceipt, MemberId } from "./chat-demo-state";
import { OTHER_MEMBERS } from "./chat-demo-state";

export type MessageDelivery = NonNullable<ChatMessage["delivery"]>;

export const DELIVERY_LABELS: Record<MessageDelivery, string> = {
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered to everyone",
  read: "Read by everyone",
  failed: "Not sent",
};

export function getMessageReceipts(
  message: ChatMessage,
  recipients: readonly MemberId[] = OTHER_MEMBERS,
): ChatReceipt[] {
  if (message.receipts) {
    const receiptsByMember = new Map(
      message.receipts.map((receipt) => [receipt.member, receipt]),
    );
    return recipients.map(
      (member) => receiptsByMember.get(member) ?? { member },
    );
  }
  return recipients.map((member) => ({
    member,
    deliveredAt:
      message.delivery === "delivered" || message.delivery === "read"
        ? message.time
        : undefined,
    readAt: message.delivery === "read" ? message.time : undefined,
  }));
}

export function getMessageDelivery(
  message: ChatMessage,
  recipients?: readonly MemberId[],
): MessageDelivery {
  if (message.delivery === "sending" || message.delivery === "failed")
    return message.delivery;
  const receipts = getMessageReceipts(message, recipients);
  if (receipts.length && receipts.every((receipt) => receipt.readAt))
    return "read";
  if (
    receipts.length &&
    receipts.every((receipt) => receipt.deliveredAt || receipt.readAt)
  )
    return "delivered";
  return "sent";
}

export function groupMessageReceipts(
  message: ChatMessage,
  recipients?: readonly MemberId[],
): {
  read: ChatReceipt[];
  delivered: ChatReceipt[];
  pending: ChatReceipt[];
} {
  const groups: ReturnType<typeof groupMessageReceipts> = {
    read: [],
    delivered: [],
    pending: [],
  };
  for (const receipt of getMessageReceipts(message, recipients)) {
    if (receipt.readAt) groups.read.push(receipt);
    else if (receipt.deliveredAt) groups.delivered.push(receipt);
    else groups.pending.push(receipt);
  }
  return groups;
}
