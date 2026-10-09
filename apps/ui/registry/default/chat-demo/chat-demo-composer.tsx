"use client";

import type { ReactElement, RefObject } from "react";
import { ChatComposer } from "../chat/chat-composer";
import { ChatMemberAvatar } from "./chat-demo-message";
import type { MemberId } from "./chat-demo-state";
import { CHAT_MEMBERS } from "./chat-demo-state";

export function ChatDemoComposer({
  draft,
  onDraftChange,
  replyAuthor,
  mentionMembers,
  onSend,
  textareaRef,
  notice,
  disabled = false,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  replyAuthor?: string;
  mentionMembers: readonly MemberId[];
  onSend: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  notice: string;
  disabled?: boolean;
}): ReactElement {
  return (
    <ChatComposer
      draft={draft}
      onDraftChange={onDraftChange}
      onSend={onSend}
      textareaRef={textareaRef}
      disabled={disabled}
      notice={notice}
      className="px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
      textareaLabel="Message"
      sendLabel="Send message"
      placeholder={
        replyAuthor ? `Reply to ${replyAuthor}…` : "Message the group…"
      }
      hint={
        <>
          Enter to send <span className="px-1.5 opacity-40">/</span> Shift +
          Enter for a new line
        </>
      }
      mentions={{
        label: "Mention suggestions",
        options: mentionMembers.map((id) => ({
          id,
          name: CHAT_MEMBERS[id].name,
          insertText: CHAT_MEMBERS[id].handle,
          avatar: (
            <ChatMemberAvatar member={id} className="size-4 text-[0.5rem]" />
          ),
        })),
      }}
    />
  );
}
