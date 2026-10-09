"use client";

import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CheckIcon,
  CopyIcon,
  MessageCircleIcon,
  RadioIcon,
  RotateCcwIcon,
} from "lucide-react";
import Link from "next/link";
import { ChatDemo } from "@/registry/default/chat-demo/chat-demo";
import type { ChatScenario } from "@/registry/default/chat-demo/chat-demo-state";
import { useCopyToClipboard } from "@/registry/default/hooks/use-copy-to-clipboard";
import { Button } from "@/registry/default/ui/button";
import { DrawerTrigger } from "@/registry/default/ui/drawer";
import { ChatPreview } from "./chat-preview";

const groups = [
  {
    title: "The conversation",
    number: "01",
    icon: MessageCircleIcon,
    description: "From a quick hello to the finer details.",
    cases: [
      {
        value: "conversation",
        label: "The full experience",
        detail: "Reply, react, mention",
      },
      {
        value: "long-message",
        label: "A little more to say",
        detail: "Expandable messages",
      },
      { value: "pinned", label: "Keep it in view", detail: "Pinned messages" },
      {
        value: "unread",
        label: "Pick up where you left off",
        detail: "Unread messages",
      },
    ],
  },
  {
    title: "In the moment",
    number: "02",
    icon: RadioIcon,
    description: "Small signals that keep everyone in sync.",
    cases: [
      {
        value: "typing",
        label: "A thought in progress",
        detail: "Typing indicator",
      },
      {
        value: "typing-multiple",
        label: "Everyone’s chiming in",
        detail: "Multiple people typing",
      },
      {
        value: "receipts",
        label: "Sent. Delivered. Seen.",
        detail: "Receipts and retry",
      },
      {
        value: "empty",
        label: "Start something",
        detail: "Join the conversation",
      },
    ],
  },
  {
    title: "Life happens",
    number: "03",
    icon: RotateCcwIcon,
    description: "A thoughtful response to the in-between.",
    cases: [
      { value: "loading", label: "On its way", detail: "Loading messages" },
      {
        value: "offline",
        label: "Back in a moment",
        detail: "Reconnect gracefully",
      },
      {
        value: "error",
        label: "Let’s try that again",
        detail: "History error",
      },
      { value: "left", label: "The door is open", detail: "Leave and rejoin" },
    ],
  },
] satisfies {
  title: string;
  number: string;
  icon: typeof MessageCircleIcon;
  description: string;
  cases: { value: ChatScenario; label: string; detail: string }[];
}[];

export function ChatShowcase() {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  return (
    <ChatDemo
      renderTriggers={(select) => (
        <>
          <section className="container grid items-center gap-12 py-14 md:grid-cols-[1fr_1fr] md:gap-14 md:py-22 lg:gap-24 lg:py-26">
            <div className="flex min-w-0 flex-col items-start">
              <div className="mb-7 flex items-center gap-2.5 text-muted-foreground text-xs">
                <MessageCircleIcon aria-hidden="true" className="size-4" />
                <span className="font-medium">Chat UI</span>
                <span aria-hidden="true">/</span>
                <span>Made for connection</span>
              </div>
              <h1 className="font-bold font-heading text-[clamp(2.75rem,5.4vw,4.5rem)] leading-[1.04] tracking-[-.035em]">
                Make room
                <br />
                for conversation.
              </h1>
              <p className="mt-6 max-w-98 text-pretty text-lg text-muted-foreground leading-relaxed">
                Bring people together with beautifully crafted chat components.
                Thoughtful details. A natural rhythm. Entirely yours.
              </p>
              <div className="mt-8 flex flex-wrap gap-2.5">
                <DrawerTrigger
                  render={<Button size="lg" />}
                  onClick={() => select("conversation")}
                >
                  Try the chat
                  <ArrowUpRightIcon aria-hidden="true" />
                </DrawerTrigger>
                <Button
                  size="lg"
                  variant="outline"
                  render={<Link href="/docs/chat" />}
                >
                  Start building
                </Button>
              </div>
              <Button
                className="mt-5 gap-3 text-muted-foreground"
                size="sm"
                variant="ghost"
                aria-label={
                  isCopied ? "Install command copied" : "Copy install command"
                }
                onClick={() =>
                  copyToClipboard("npx shadcn@latest add @coss/chat")
                }
              >
                <span aria-hidden="true" className="opacity-50">
                  $
                </span>
                <code className="text-xs">
                  npx shadcn@latest add @coss/chat
                </code>
                {isCopied ? (
                  <CheckIcon aria-hidden="true" />
                ) : (
                  <CopyIcon aria-hidden="true" />
                )}
              </Button>
              <p className="mt-8 text-muted-foreground text-xs">
                Built with Base UI · Tailwind CSS · Motion
              </p>
            </div>
            <div className="relative mx-auto w-full max-w-112">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-3 rounded-[1.75rem] border border-foreground/8 border-dashed md:-inset-5 md:rounded-4xl"
              />
              <ChatPreview />
              <p className="mt-4 text-center text-muted-foreground text-xs">
                Try a message. See how it feels.
              </p>
            </div>
          </section>
          <section
            className="border-y bg-background/50"
            aria-labelledby="chat-examples"
          >
            <div className="container py-12 md:py-18">
              <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="mb-3 text-muted-foreground text-xs">
                    THE LITTLE THINGS, CONSIDERED
                  </p>
                  <h2
                    id="chat-examples"
                    className="font-bold font-heading text-3xl tracking-tight md:text-4xl"
                  >
                    There’s a state for that.
                  </h2>
                </div>
                <p className="max-w-76 text-muted-foreground text-sm leading-relaxed">
                  Open an example. Make it your own.
                  <br />
                  Every detail is yours to explore.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {groups.map((group) => (
                  <div
                    key={group.number}
                    className="rounded-xl border bg-popover p-2"
                  >
                    <div className="px-3 pt-3 pb-5">
                      <div className="mb-5 flex items-center justify-between text-muted-foreground">
                        <group.icon
                          aria-hidden="true"
                          className="size-5 stroke-[1.5]"
                        />
                        <span className="font-mono text-xs opacity-60">
                          {group.number}
                        </span>
                      </div>
                      <h3 className="font-medium text-base">{group.title}</h3>
                      <p className="mt-1 text-muted-foreground text-xs">
                        {group.description}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {group.cases.map((item) => (
                        <DrawerTrigger
                          key={item.value}
                          onClick={() => select(item.value)}
                          render={
                            <Button
                              variant="ghost"
                              className="h-auto justify-between gap-3 px-3 py-3 text-start sm:h-auto"
                            />
                          }
                        >
                          <span className="flex min-w-0 flex-col gap-1">
                            <span className="text-sm">{item.label}</span>
                            <span className="font-normal text-muted-foreground text-xs">
                              {item.detail}
                            </span>
                          </span>
                          <ArrowUpRightIcon
                            aria-hidden="true"
                            className="size-4 opacity-40"
                          />
                        </DrawerTrigger>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-muted-foreground text-xs">
                  And when access changes
                </span>
                {(
                  [
                    { value: "removed", label: "Removed" },
                    { value: "banned", label: "Banned" },
                    { value: "access-lost", label: "Access lost" },
                  ] as const
                ).map((item) => (
                  <DrawerTrigger
                    key={item.value}
                    render={<Button variant="ghost" size="sm" />}
                    onClick={() => select(item.value)}
                  >
                    {item.label}
                    <ArrowUpRightIcon aria-hidden="true" />
                  </DrawerTrigger>
                ))}
              </div>
            </div>
          </section>
          <section
            className="container grid gap-10 py-14 md:grid-cols-[1fr_1.1fr] md:gap-20 md:py-22"
            aria-labelledby="chat-build"
          >
            <div>
              <p className="mb-4 text-muted-foreground text-xs">
                YOUR PRODUCT. YOUR CONVERSATION.
              </p>
              <h2
                id="chat-build"
                className="max-w-100 font-bold font-heading text-3xl tracking-tight md:text-4xl"
              >
                The details are done.
                <br />
                The possibilities are open.
              </h2>
              <Button
                className="mt-6"
                variant="outline"
                render={<Link href="/docs/chat" />}
              >
                Explore the components
                <ArrowRightIcon aria-hidden="true" />
              </Button>
            </div>
            <div className="grid gap-7 sm:grid-cols-2">
              {[
                {
                  title: "Fits right in",
                  text: "A drawer, a panel, or a whole page. Compose a chat that feels at home in your product.",
                },
                {
                  title: "Feels alive",
                  text: "Expressive reactions, soft message entrances, and replies that stay in context.",
                },
                {
                  title: "Ready for real life",
                  text: "Long messages, lost connections, small screens, and keyboards. The awkward bits, considered.",
                },
                {
                  title: "Yours to own",
                  text: "Copy the source. Connect your data. Keep the parts you love and change everything else.",
                },
              ].map((item) => (
                <div key={item.title}>
                  <h3 className="font-medium text-sm">{item.title}</h3>
                  <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    />
  );
}
