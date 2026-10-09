"use client";

import { CopyIcon, InfoIcon, PinIcon, Trash2Icon } from "lucide-react";
import type { ReactElement } from "react";
import { useRef, useState } from "react";
import { cn } from "@/registry/default/lib/utils";
import { Avatar, AvatarFallback } from "@/registry/default/ui/avatar";
import { Badge } from "@/registry/default/ui/badge";
import { Button } from "@/registry/default/ui/button";
import { MenuItem, MenuSeparator } from "@/registry/default/ui/menu";
import { ChatCollapsibleMessage } from "../chat/chat-collapsible-message";
import { ChatDeliveryIndicator } from "../chat/chat-delivery-indicator";
import { ChatMessage as ChatMessageView } from "../chat/chat-message";
import { ChatMessageActionToolbar } from "../chat/chat-message-actions";
import { ChatMessageText } from "../chat/chat-message-text";
import { ChatReactionChip } from "../chat/chat-reaction-chip";
import { ChatReactionPicker } from "../chat/chat-reaction-picker";
import { ChatReplyReference } from "../chat/chat-reply-reference";
import { DELIVERY_LABELS, getMessageDelivery } from "./chat-demo-receipts";
import type { ChatMessage, MemberId } from "./chat-demo-state";
import {
  CHAT_EMOJI,
  CHAT_MEMBERS,
  getMessageDeletionReason,
  getMessagePreview,
} from "./chat-demo-state";

export function ChatMemberAvatar({
  member,
  className,
}: {
  member: MemberId;
  className?: string;
}): ReactElement {
  return (
    <Avatar
      aria-hidden="true"
      className={cn("size-7 text-[.625rem]", className)}
    >
      <AvatarFallback className={CHAT_MEMBERS[member].color}>
        {CHAT_MEMBERS[member].initials}
      </AvatarFallback>
    </Avatar>
  );
}

export function ChatDemoMessageBody({
  message,
  replyMessage,
  onJump,
  defaultOpen,
  open,
  onOpenChange,
}: {
  message: ChatMessage;
  replyMessage?: ChatMessage;
  onJump?: (id: number) => void;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}): ReactElement {
  const own = message.author === "you";
  return (
    <>
      {message.forwarded && (
        <span className="text-xs italic opacity-65">Forwarded</span>
      )}
      {message.replyTo && (
        <ChatReplyReference
          author={
            replyMessage
              ? CHAT_MEMBERS[replyMessage.author].name
              : "Original message"
          }
          preview={
            replyMessage
              ? getMessagePreview(replyMessage)
              : "Message unavailable"
          }
          onClick={() => onJump?.(message.replyTo ?? message.id)}
          disabled={!replyMessage || !onJump}
        />
      )}
      <ChatCollapsibleMessage
        defaultOpen={defaultOpen}
        open={open}
        onOpenChange={onOpenChange}
        text={message.text}
        side={own ? "outgoing" : "incoming"}
        showMoreLabel="Show more"
        showLessLabel="Show less"
        renderText={(text) => (
          <ChatMessageText
            text={text}
            mentions={Object.values(CHAT_MEMBERS).map(
              (member) => member.handle,
            )}
          />
        )}
      />
    </>
  );
}

export function ChatDemoMessage({
  message,
  recipients,
  entering,
  onEntranceEnd,
  replyMessage,
  grouped,
  groupEnd,
  pinned,
  highlighted,
  replyLifted,
  domId,
  onReply,
  onReact,
  onPin,
  onDelete,
  onCopy,
  onJump,
  onRetry,
  onInfo,
}: {
  message: ChatMessage;
  recipients: readonly MemberId[];
  entering: boolean;
  onEntranceEnd: () => void;
  replyMessage?: ChatMessage;
  grouped: boolean;
  groupEnd: boolean;
  pinned: boolean;
  highlighted: boolean;
  replyLifted: boolean;
  domId: string;
  onReply: (
    id: number,
    source: HTMLDivElement,
    firstInGroup: boolean,
    expanded: boolean,
  ) => void;
  onReact: (id: number, emoji: string) => void;
  onPin: (id: number) => void;
  onDelete: (id: number, trigger: HTMLElement | null) => void;
  onCopy: (text: string) => void;
  onJump: (id: number) => void;
  onRetry: (id: number) => void;
  onInfo: (id: number, trigger: HTMLElement | null) => void;
}): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const suppressMenuFocusRef = useRef(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const replyToMessage = (): void => {
    if (bubbleRef.current)
      onReply(message.id, bubbleRef.current, !grouped, expanded);
  };
  const initialReactions = useRef(
    new Set(message.reactions.map((reaction) => reaction.emoji)),
  );
  const delivery = getMessageDelivery(message, recipients);
  const own = message.author === "you";
  const member = CHAT_MEMBERS[message.author];
  return (
    <ChatMessageView
      id={domId}
      tabIndex={-1}
      aria-label={`${member.name}, ${message.dateLabel} at ${message.time}`}
      side={own ? "outgoing" : "incoming"}
      author={member.name}
      avatar={<ChatMemberAvatar member={message.author} />}
      grouped={grouped}
      lifted={replyLifted}
      bubble={!message.deletedReason}
      bubbleProps={{ ref: bubbleRef }}
      animateEntrance={entering}
      onAnimationComplete={entering ? onEntranceEnd : undefined}
      highlighted={highlighted}
      actions={
        <ChatMessageActionToolbar
          menuTriggerRef={moreTriggerRef}
          side={own ? "outgoing" : "incoming"}
          toolbarLabel="Message actions"
          reactionPicker={(toolbarRef) => (
            <ChatReactionPicker
              inToolbar
              options={CHAT_EMOJI}
              selectedEmojis={message.reactions
                .filter((reaction) => reaction.members.includes("you"))
                .map((reaction) => reaction.emoji)}
              triggerLabel="React to message"
              triggerTooltip="React"
              popupLabel="Choose a reaction"
              popupAlign={own ? "start" : "end"}
              popupAnchor={toolbarRef}
              onSelect={(emoji) => onReact(message.id, emoji)}
            />
          )}
          replyLabel={`Reply to ${member.name}`}
          replyTooltip="Reply"
          onReply={replyToMessage}
          moreLabel={`More actions for ${member.name}'s message`}
          moreTooltip="More actions"
          menuFinalFocus={() => {
            if (!suppressMenuFocusRef.current) return true;
            suppressMenuFocusRef.current = false;
            return false;
          }}
          menuChildren={
            <>
              <MenuItem onClick={() => onCopy(message.text)}>
                <CopyIcon /> Copy text
              </MenuItem>
              <MenuItem onClick={() => onPin(message.id)}>
                <PinIcon /> {pinned ? "Unpin message" : "Pin message"}
              </MenuItem>
              {own && (
                <MenuItem
                  onClick={() => {
                    suppressMenuFocusRef.current = true;
                    onInfo(message.id, moreTriggerRef.current);
                  }}
                >
                  <InfoIcon /> Message info
                </MenuItem>
              )}
              {getMessageDeletionReason(message) && (
                <>
                  <MenuSeparator />
                  <MenuItem
                    variant="destructive"
                    onClick={() => {
                      suppressMenuFocusRef.current = true;
                      onDelete(message.id, moreTriggerRef.current);
                    }}
                  >
                    <Trash2Icon /> Delete message
                  </MenuItem>
                </>
              )}
            </>
          }
        />
      }
      reactions={
        message.reactions.length > 0 && !message.deletedReason
          ? message.reactions.map((reaction) => (
              <ChatReactionChip
                key={reaction.emoji}
                animateEntrance={!initialReactions.current.has(reaction.emoji)}
                emoji={reaction.emoji}
                count={reaction.members.length}
                reactorLabel={`${reaction.members.length} ${reaction.members.length === 1 ? "reaction" : "reactions"}`}
                popupAlign={own ? "end" : "start"}
                selected={reaction.members.includes("you")}
                label={`${reaction.members.includes("you") ? "Remove" : "Add"} ${reaction.emoji} reaction, ${reaction.members.length} ${reaction.members.length === 1 ? "person" : "people"}`}
                reactorContent={
                  <ul
                    aria-label="People who reacted"
                    className="flex max-h-48 flex-col overflow-y-auto overscroll-contain"
                  >
                    {reaction.members.map((member) => (
                      <li
                        key={member}
                        className="flex items-center gap-2 px-1.5 py-1 text-xs leading-5"
                      >
                        <ChatMemberAvatar
                          member={member}
                          className="size-5 text-[.5625rem]"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {CHAT_MEMBERS[member].name}
                        </span>
                        {member === "you" && (
                          <Badge variant="secondary" size="sm">
                            You
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                }
                onClick={() => onReact(message.id, reaction.emoji)}
              />
            ))
          : undefined
      }
      footer={
        groupEnd || message.delivery ? (
          <>
            {pinned && !message.deletedReason && (
              <PinIcon className="size-2.5" aria-label="Pinned" />
            )}
            <time>{message.time}</time>
            {own && !message.deletedReason && (
              <>
                <ChatDeliveryIndicator
                  status={delivery}
                  label={DELIVERY_LABELS[delivery]}
                />
                {message.delivery === "failed" && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onRetry(message.id)}
                  >
                    Retry
                  </Button>
                )}
              </>
            )}
          </>
        ) : undefined
      }
    >
      {message.deletedReason ? (
        <div className="flex items-center gap-1 px-1 py-2 text-muted-foreground text-xs">
          <Trash2Icon className="size-3 opacity-80" aria-hidden="true" />{" "}
          {getMessagePreview(message)}
        </div>
      ) : (
        <ChatDemoMessageBody
          message={message}
          replyMessage={replyMessage}
          onJump={onJump}
          open={expanded}
          onOpenChange={setExpanded}
        />
      )}
    </ChatMessageView>
  );
}
