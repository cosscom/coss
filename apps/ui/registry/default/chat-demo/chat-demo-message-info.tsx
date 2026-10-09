"use client";

import { ArrowLeftIcon, CheckCheckIcon, ClockIcon } from "lucide-react";
import type { ReactElement, RefObject } from "react";
import { useRef } from "react";
import { cn } from "@/registry/default/lib/utils";
import { Button } from "@/registry/default/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/registry/default/ui/drawer";
import { ChatDeliveryIndicator } from "../chat/chat-delivery-indicator";
import { ChatMessageBubble } from "../chat/chat-message-bubble";
import { ChatMessageInfo as ChatMessageInfoView } from "../chat/chat-message-info";
import { ChatDemoMessageBody, ChatMemberAvatar } from "./chat-demo-message";
import {
  DELIVERY_LABELS,
  getMessageDelivery,
  groupMessageReceipts,
} from "./chat-demo-receipts";
import type { ChatMessage, MemberId } from "./chat-demo-state";
import { CHAT_MEMBERS } from "./chat-demo-state";

const RECEIPT_SECTIONS = [
  { key: "read", label: "Read by", icon: CheckCheckIcon },
  {
    key: "delivered",
    label: "Delivered to",
    icon: CheckCheckIcon,
  },
  {
    key: "pending",
    label: "Pending delivery",
    icon: ClockIcon,
  },
] as const;

export function ChatMessageInfo({
  message,
  recipients,
  replyMessage,
  position,
  open,
  onOpenChange,
  onClosed,
  returnFocusRef,
}: {
  message?: ChatMessage;
  recipients: readonly MemberId[];
  replyMessage?: ChatMessage;
  position: "bottom" | "right";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}): ReactElement {
  const backRef = useRef<HTMLButtonElement>(null);
  const groups = message
    ? groupMessageReceipts(message, recipients)
    : { read: [], delivered: [], pending: [] };
  const visibleSections = RECEIPT_SECTIONS.filter(
    ({ key }) => groups[key].length > 0,
  );
  const delivery = message ? getMessageDelivery(message, recipients) : "sent";
  return (
    <Drawer
      position={position}
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) onClosed();
      }}
    >
      {message && (
        <DrawerPopup
          variant="inset"
          initialFocus={backRef}
          finalFocus={returnFocusRef}
          className={
            position === "bottom" ? "[--drawer-height:92dvh]" : undefined
          }
        >
          <DrawerHeader>
            <div className="flex items-start gap-2">
              <DrawerClose
                render={
                  <Button
                    ref={backRef}
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Back to conversation"
                  />
                }
              >
                <ArrowLeftIcon />
              </DrawerClose>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <DrawerTitle>Message info</DrawerTitle>
                <DrawerDescription>The studio</DrawerDescription>
              </div>
            </div>
          </DrawerHeader>
          <DrawerPanel>
            <ChatMessageInfoView
              message={
                <ChatMessageBubble side="outgoing">
                  <ChatDemoMessageBody
                    message={message}
                    replyMessage={replyMessage}
                  />
                </ChatMessageBubble>
              }
              metadata={
                <>
                  <time>
                    {message.dateLabel}, {message.time}
                  </time>
                  <ChatDeliveryIndicator
                    status={delivery}
                    label={DELIVERY_LABELS[delivery]}
                  />
                </>
              }
              groups={visibleSections.map(({ key, label, icon: Icon }) => ({
                id: key,
                label,
                icon: (
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      "size-3.5",
                      key === "read"
                        ? "text-sky-600 dark:text-sky-400"
                        : "text-muted-foreground",
                    )}
                  />
                ),
                members: groups[key].map((receipt) => ({
                  id: receipt.member,
                  name: CHAT_MEMBERS[receipt.member].name,
                  avatar: <ChatMemberAvatar member={receipt.member} />,
                  action: (
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {receipt.readAt ?? receipt.deliveredAt ?? "Pending"}
                    </span>
                  ),
                })),
              }))}
            />
          </DrawerPanel>
        </DrawerPopup>
      )}
    </Drawer>
  );
}
