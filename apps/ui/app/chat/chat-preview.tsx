"use client";

import { CheckCheckIcon } from "lucide-react";
import { useRef, useState } from "react";
import { ChatComposer } from "@/registry/default/chat/chat-composer";
import { ChatConversation } from "@/registry/default/chat/chat-conversation";
import { ChatMessage } from "@/registry/default/chat/chat-message";
import { ChatReactionChip } from "@/registry/default/chat/chat-reaction-chip";
import { useChatScroll } from "@/registry/default/chat/hooks/use-chat-scroll";
import { Avatar, AvatarFallback } from "@/registry/default/ui/avatar";
import { TooltipProvider } from "@/registry/default/ui/tooltip";

const initialMessages = [
  {
    id: 1,
    own: false,
    text: "What if the little things felt a little more human?",
    author: "Maya Chen",
    initials: "MC",
  },
  {
    id: 2,
    own: true,
    text: "Like a conversation, not another comment box.",
    author: "You",
    initials: "SR",
  },
  {
    id: 3,
    own: false,
    text: "Exactly. I think we’re onto something ✨",
    author: "Jordan Lee",
    initials: "JL",
  },
];

export function ChatPreview() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [reacted, setReacted] = useState(false);
  const nextId = useRef(4);
  const scroll = useChatScroll({ itemCount: messages.length });

  return (
    <TooltipProvider>
      <section
        aria-label="Live chat preview"
        className="flex h-148 min-w-0 flex-col overflow-hidden rounded-2xl border bg-popover shadow-xl/4 sm:h-134"
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h2 className="font-semibold text-sm">The studio</h2>
            <p className="mt-1 text-muted-foreground text-xs">
              Maya, Jordan, and you
            </p>
          </div>
          <span className="rounded-full border px-2 py-1 text-[.625rem] text-muted-foreground">
            Live preview
          </span>
        </div>
        <ChatConversation
          scroll={scroll}
          label="Preview messages"
          jumpLabel="Jump to latest"
        >
          <div className="flex flex-col gap-5 pt-3">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                side={message.own ? "outgoing" : "incoming"}
                author={message.author}
                avatar={
                  <Avatar className="size-7 text-[.625rem]">
                    <AvatarFallback>{message.initials}</AvatarFallback>
                  </Avatar>
                }
                animateEntrance={message.id > 3}
                reactions={
                  message.id === 3 ? (
                    <ChatReactionChip
                      emoji="❤️"
                      count={reacted ? 3 : 2}
                      selected={reacted}
                      label="React with heart"
                      reactorLabel="People who reacted with heart"
                      onClick={() => setReacted((value) => !value)}
                      reactorContent={
                        <div className="space-y-2 p-1 text-xs">
                          <p>Maya Chen</p>
                          <p>Alex Morgan</p>
                          {reacted && <p>You</p>}
                        </div>
                      }
                    />
                  ) : undefined
                }
                footer={
                  <span className="inline-flex items-center gap-1 text-[.625rem] text-muted-foreground">
                    10:42{" "}
                    {message.own && (
                      <CheckCheckIcon aria-hidden="true" className="size-3" />
                    )}
                  </span>
                }
              >
                {message.text}
              </ChatMessage>
            ))}
          </div>
        </ChatConversation>
        <ChatComposer
          compact
          className="px-4 pt-2 pb-4"
          draft={draft}
          onDraftChange={setDraft}
          onSend={(text) => {
            const id = nextId.current++;
            scroll.atBottomRef.current = true;
            setMessages((current) => [
              ...current,
              { id, own: true, text, author: "You", initials: "SR" },
            ]);
            setDraft("");
          }}
          textareaLabel="Preview message"
          sendLabel="Send message"
          placeholder="Say something nice…"
        />
      </section>
    </TooltipProvider>
  );
}
