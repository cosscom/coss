import { describe, expect, it } from "bun:test";
import {
  getMessageDelivery,
  groupMessageReceipts,
} from "../../registry/default/chat-demo/chat-demo-receipts";
import type { ChatMessage } from "../../registry/default/chat-demo/chat-demo-state";

const partial: ChatMessage = {
  id: 1,
  author: "you",
  text: "See you there",
  time: "10:49",
  dateLabel: "Today",
  reactions: [],
  receipts: [
    { member: "maya", deliveredAt: "10:49", readAt: "10:50" },
    { member: "jordan", deliveredAt: "10:49" },
    { member: "alex" },
  ],
};

describe("group message receipts", () => {
  it("keeps a single check until all recipients receive the message", () => {
    expect(getMessageDelivery(partial)).toBe("sent");
    expect(
      getMessageDelivery({
        ...partial,
        receipts: partial.receipts?.map((receipt) => ({
          ...receipt,
          deliveredAt: "10:49",
        })),
      }),
    ).toBe("delivered");
  });

  it("requires every recipient to read before showing blue checks", () => {
    expect(
      getMessageDelivery({
        ...partial,
        receipts: partial.receipts?.map((receipt) => ({
          ...receipt,
          readAt: "10:50",
        })),
      }),
    ).toBe("read");
    expect(getMessageDelivery({ ...partial, receipts: [] })).toBe("sent");
  });

  it("places each recipient in exactly one group, prioritizing read receipts", () => {
    const groups = groupMessageReceipts(partial);
    expect(groups.read.map((receipt) => receipt.member)).toEqual(["maya"]);
    expect(groups.delivered.map((receipt) => receipt.member)).toEqual([
      "jordan",
    ]);
    expect(groups.pending.map((receipt) => receipt.member)).toEqual(["alex"]);
  });

  it("excludes a banned member from current receipts and delivery status", () => {
    expect(getMessageDelivery(partial)).toBe("sent");
    expect(getMessageDelivery(partial, ["maya", "jordan"])).toBe("delivered");
    expect(groupMessageReceipts(partial, ["maya", "jordan"]).pending).toEqual(
      [],
    );
    expect(
      groupMessageReceipts(
        { ...partial, receipts: undefined, delivery: "read" },
        ["maya", "jordan"],
      ).read.map((receipt) => receipt.member),
    ).toEqual(["maya", "jordan"]);
  });

  it("starts a restored member with a pending receipt instead of reviving their old read state", () => {
    const message: ChatMessage = {
      ...partial,
      delivery: "read",
      receipts: [{ member: "maya", deliveredAt: "10:49", readAt: "10:50" }],
    };
    const groups = groupMessageReceipts(message, ["maya", "alex"]);
    expect(groups.read.map((receipt) => receipt.member)).toEqual(["maya"]);
    expect(groups.pending).toEqual([{ member: "alex" }]);
    expect(getMessageDelivery(message, ["maya", "alex"])).toBe("sent");
  });

  it("keeps pending transport states and retry delivery consistent with the details", () => {
    const message = { ...partial, receipts: undefined };
    expect(getMessageDelivery({ ...message, delivery: "sending" })).toBe(
      "sending",
    );
    expect(getMessageDelivery({ ...message, delivery: "failed" })).toBe(
      "failed",
    );
    expect(
      groupMessageReceipts({ ...message, delivery: "failed" }).pending,
    ).toHaveLength(3);
    expect(
      groupMessageReceipts({ ...message, delivery: "delivered" }).delivered,
    ).toHaveLength(3);
    expect(
      groupMessageReceipts({ ...message, delivery: "read" }).read,
    ).toHaveLength(3);
  });
});
