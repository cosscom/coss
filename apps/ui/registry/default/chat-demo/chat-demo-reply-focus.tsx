"use client";

import type { ReactElement, RefObject } from "react";
import {
  ChatReplyPreview,
  type ChatReplyTarget,
} from "../chat/chat-reply-preview";
import { ChatDemoMessageBody, ChatMemberAvatar } from "./chat-demo-message";
import type { ChatMessage } from "./chat-demo-state";
import { CHAT_MEMBERS } from "./chat-demo-state";

export type ChatReplyFocusTarget = ChatReplyTarget & {
  messageId: number;
  expanded: boolean;
};

export function ChatDemoReplyFocus({
  target,
  message,
  replyMessage,
  dismissalRef,
  onCancel,
}: {
  target: ChatReplyFocusTarget;
  message: ChatMessage;
  replyMessage?: ChatMessage;
  dismissalRef: RefObject<"cancel" | "send">;
  onCancel: () => void;
}): ReactElement {
  const own = message.author === "you";
  return (
    <ChatReplyPreview
      target={target}
      side={own ? "outgoing" : "incoming"}
      avatar={<ChatMemberAvatar member={message.author} />}
      author={own ? "your message" : CHAT_MEMBERS[message.author].name}
      replyLabel={
        own
          ? "Reply to your message"
          : `Reply to ${CHAT_MEMBERS[message.author].name}`
      }
      cancelLabel="Cancel reply"
      dismissalRef={dismissalRef}
      onCancel={onCancel}
    >
      <ChatDemoMessageBody
        defaultOpen={target.expanded}
        message={message}
        replyMessage={replyMessage}
      />
    </ChatReplyPreview>
  );
}
