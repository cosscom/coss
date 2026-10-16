"use client";

import { Avatar, AvatarFallback } from "@coss/ui/components/avatar";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@coss/ui/components/card";
import { ChatMessage } from "@coss/ui/components/chat/chat-message";
import { ChatMessageText } from "@coss/ui/components/chat/chat-message-text";
import { ChatTypingIndicator } from "@coss/ui/components/chat/chat-typing-indicator";
import { ChatUnreadDivider } from "@coss/ui/components/chat/chat-unread-divider";
import {
  Composer,
  ComposerActionGroup,
  ComposerActions,
  ComposerInput,
  ComposerSubmit,
} from "@coss/ui/components/composer";
import { Progress, ProgressIndicator, ProgressTrack } from "@coss/ui/components/progress";
import { Textarea } from "@coss/ui/components/textarea";
import { cn } from "@coss/ui/lib/utils";
import { ArrowUpIcon, RotateCcwIcon, ShipIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { ease, Status, useScene, Window } from "./scene";

/*
 * The Prompt Request flow as a chat thread, built from coss ui's chat and composer: the
 * contributor types a request and sends it, a maintainer approves it with a comment, the request
 * goes to Shipyard, and Shipyard answers with a screenshot and a preview URL. It plays once when
 * it scrolls into view and can be replayed; under `prefers-reduced-motion` it shows the finished
 * thread. The thread is decorative (inert, hidden from assistive tech); the figure's caption
 * describes it.
 */

const PROMPT =
  "Let me filter the bookings list by date. Presets like ‘this week’ and ‘last 30 days’ would cover almost everything I do.";
const COMMENT = "Yes. Keep it to the presets plus a custom range, and remember the last choice.";
const PREVIEW_URL = "https://preview-483.shipyard.build";

const PHASES = [
  "idle",
  "typing",
  "sent",
  "review",
  "commenting",
  "approving",
  "approved",
  "shipyard",
  "building",
  "replying",
  "done",
] as const;
type Phase = (typeof PHASES)[number];

/** How long each timed phase lasts; typing and building advance on their own. */
const HOLD_MS: Partial<Record<Phase, number>> = {
  idle: 700,
  sent: 1100,
  review: 900,
  approving: 700,
  approved: 1100,
  shipyard: 900,
  replying: 1600,
};
const TYPE_MS = 22;
const COMMENT_TYPE_MS = 30;
const BUILD_TICK_MS = 110;

const STEPS = [
  { label: "Prompt", from: "typing" },
  { label: "Approve", from: "review" },
  { label: "Shipyard", from: "shipyard" },
  { label: "Preview", from: "done" },
] as const satisfies readonly { label: string; from: Phase }[];

const at = (phase: Phase) => PHASES.indexOf(phase);

export function PromptRequestChat() {
  const { ref, play, reduced } = useScene(0.35);
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [typed, setTyped] = useState(0);
  const [comment, setComment] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!play) return;
    if (reduced) {
      setPhase("done");
      setTyped(PROMPT.length);
      setComment(COMMENT.length);
      setProgress(100);
      return;
    }
    const next = () => setPhase(PHASES[at(phase) + 1] ?? "done");
    let id: ReturnType<typeof setTimeout> | undefined;
    if (phase === "typing") {
      id =
        typed < PROMPT.length
          ? setTimeout(() => setTyped((current) => current + 1), TYPE_MS)
          : setTimeout(next, 450);
    } else if (phase === "commenting") {
      id =
        comment < COMMENT.length
          ? setTimeout(() => setComment((current) => current + 1), COMMENT_TYPE_MS)
          : setTimeout(next, 500);
    } else if (phase === "building") {
      id =
        progress < 100
          ? setTimeout(() => setProgress((current) => Math.min(100, current + 3)), BUILD_TICK_MS)
          : setTimeout(next, 400);
    } else if (phase !== "done") {
      id = setTimeout(next, HOLD_MS[phase] ?? 800);
    }
    return () => clearTimeout(id);
  }, [play, reduced, phase, typed, comment, progress]);

  const replay = () => {
    setTyped(0);
    setComment(0);
    setProgress(0);
    setPhase(reduced ? "done" : "idle");
    setRun((current) => current + 1);
  };

  const now = at(phase);
  const reached = (target: Phase) => now >= at(target);
  const currentStep = STEPS.reduce(
    (step, candidate, index) => (reached(candidate.from) ? index : step),
    0,
  );
  const sent = reached("sent");

  return (
    <figure className="flex w-full max-w-3xl flex-col gap-3" ref={ref}>
      <figcaption className="sr-only">
        An illustrative Prompt Request. A contributor types, in plain English, “{PROMPT}” and sends
        it. A maintainer approves it with the comment “{COMMENT}” (declining with a comment is the
        other option). The request is sent to Shipyard, the maintainer's software factory, which
        builds it and replies to the author with a screenshot and a preview URL.
      </figcaption>
      <div className="flex items-center justify-between gap-3">
        <ol aria-hidden className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
          {STEPS.map((step, index) => (
            <li
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2 py-0.5 transition-colors duration-300",
                index === currentStep && play
                  ? "border-foreground bg-foreground text-background"
                  : index < currentStep
                    ? "text-foreground"
                    : "text-muted-foreground",
              )}
              key={step.label}
            >
              <span>{index + 1}</span>
              <span>{step.label}</span>
            </li>
          ))}
        </ol>
        <Button
          aria-label="Replay the Prompt Request demo"
          className="shrink-0"
          disabled={!play || (!reduced && phase !== "done")}
          onClick={replay}
          size="xs"
          variant="outline"
        >
          <RotateCcwIcon aria-hidden />
          Replay
        </Button>
      </div>
      <div aria-hidden inert>
        <Window title="prompt request #483 · acme/bookings">
          <div className="flex h-[48rem] flex-col justify-end gap-4 overflow-hidden px-4 pt-4 mask-[linear-gradient(to_bottom,transparent,black_2.5rem)] sm:h-[44rem]">
            <AnimatePresence initial={false}>
              {sent && (
                <Entry key={`prompt-${run}`} reduced={reduced}>
                  <ChatMessage
                    animateEntrance={!reduced}
                    footer="Prompt Request #483 opened · 0 lines of code"
                    side="outgoing"
                  >
                    {PROMPT}
                  </ChatMessage>
                </Entry>
              )}
              {reached("review") && (
                <Entry key={`review-${run}`} reduced={reduced}>
                  <ChatMessage
                    author="Lena · maintainer"
                    avatar={<Person initials="L" />}
                    bubble={false}
                    side="incoming"
                  >
                    <ApprovalCard
                      approved={reached("approved")}
                      comment={COMMENT.slice(0, comment)}
                      pressing={phase === "approving"}
                      reduced={reduced}
                    />
                  </ChatMessage>
                </Entry>
              )}
              {reached("shipyard") && (
                <Entry key={`sent-${run}`} reduced={reduced}>
                  <ChatUnreadDivider className="my-0 font-mono font-normal text-muted-foreground">
                    Request sent to Shipyard
                  </ChatUnreadDivider>
                </Entry>
              )}
              {reached("shipyard") && phase !== "done" && (
                <Entry key={`working-${run}`} reduced={reduced}>
                  <ChatMessage
                    avatar={<ShipyardAvatar />}
                    author="Shipyard"
                    bubbleProps={{ className: "w-72 max-w-full" }}
                    side="incoming"
                  >
                    <Working progress={progress} reduced={reduced} />
                  </ChatMessage>
                </Entry>
              )}
              {reached("replying") && phase !== "done" && (
                <Entry key={`typing-${run}`} reduced={reduced}>
                  <ChatTypingIndicator label="Shipyard is writing…" />
                </Entry>
              )}
              {phase === "done" && (
                <Entry key={`reply-${run}`} reduced={reduced}>
                  <ChatMessage
                    animateEntrance={!reduced}
                    author="Shipyard"
                    avatar={<ShipyardAvatar />}
                    footer="@maya notified · preview is public"
                    side="incoming"
                  >
                    <ChatMessageText
                      mentions={["maya"]}
                      text="@maya #483 is built, tested and deployed. Bookings can now be filtered by date:"
                    />
                    <Screenshot />
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="break-all underline underline-offset-4">{PREVIEW_URL}</span>
                      <Badge size="sm" variant="outline">
                        example
                      </Badge>
                    </span>
                  </ChatMessage>
                </Entry>
              )}
            </AnimatePresence>
            <div className="-mx-4 shrink-0 border-t bg-background px-4 py-3">
              <Composer
                layout="adaptive"
                readOnly
                value={[{ type: "text", text: sent ? "" : PROMPT.slice(0, typed) }]}
              >
                <ComposerInput
                  aria-label="Prompt Request"
                  placeholder="Describe a change in plain English…"
                />
                <ComposerActions>
                  <ComposerActionGroup align="end">
                    <motion.span
                      animate={
                        phase === "typing" && typed >= PROMPT.length
                          ? { scale: [1, 0.86, 1] }
                          : { scale: 1 }
                      }
                      className="flex"
                      transition={ease(reduced, { duration: 0.35 })}
                    >
                      <ComposerSubmit
                        disabled={phase !== "typing" || typed === 0}
                        render={
                          <Button
                            aria-label="Send"
                            className="rounded-full before:rounded-full"
                            size="icon"
                          >
                            <ArrowUpIcon aria-hidden className="size-4" />
                          </Button>
                        }
                      />
                    </motion.span>
                  </ComposerActionGroup>
                </ComposerActions>
              </Composer>
            </div>
          </div>
        </Window>
      </div>
    </figure>
  );
}

/** A chat entry that slides up as the thread grows. */
function Entry({ reduced, children }: { reduced: boolean; children: ReactNode }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex shrink-0 flex-col gap-4"
      exit={{ opacity: 0 }}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      layout={!reduced}
      transition={ease(reduced, { duration: 0.45 })}
    >
      {children}
    </motion.div>
  );
}

function Person({ initials }: { initials: string }) {
  return (
    <Avatar className="size-7 border">
      <AvatarFallback className="bg-muted text-[11px]">{initials}</AvatarFallback>
    </Avatar>
  );
}

function ShipyardAvatar() {
  return (
    <Avatar className="size-7 bg-foreground text-background">
      <AvatarFallback className="bg-transparent">
        <ShipIcon aria-hidden className="size-3.5" />
      </AvatarFallback>
    </Avatar>
  );
}

/** The maintainer's decision: a comment, then Approve (or Decline, with the same comment). */
function ApprovalCard({
  approved,
  comment,
  pressing,
  reduced,
}: {
  approved: boolean;
  comment: string;
  pressing: boolean;
  reduced: boolean;
}) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-sm">Review Prompt Request #483</CardTitle>
        <CardDescription className="text-xs">
          Filter bookings by date · opened by @maya
        </CardDescription>
      </CardHeader>
      <CardPanel className="p-4">
        {approved ? (
          <p className="border-l-2 pl-3 text-muted-foreground text-sm leading-snug">{comment}</p>
        ) : (
          <Textarea
            aria-label="Comment"
            placeholder="Add a comment. Required either way."
            readOnly
            rows={2}
            size="sm"
            value={comment}
          />
        )}
      </CardPanel>
      <CardFooter className="justify-end gap-2 p-4 pt-0">
        <AnimatePresence initial={false} mode="wait">
          {approved ? (
            <motion.span
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 font-mono text-muted-foreground text-xs"
              initial={reduced ? false : { opacity: 0 }}
              key="approved"
              transition={ease(reduced, { duration: 0.3 })}
            >
              <Status reduced={reduced} state="passed" />
              Approved by Lena with a comment
            </motion.span>
          ) : (
            <motion.span
              className="flex gap-2"
              exit={{ opacity: 0 }}
              key="buttons"
              transition={{ duration: 0.2 }}
            >
              <Button size="sm" variant="outline">
                Decline with comment
              </Button>
              <motion.span
                animate={pressing ? { scale: [1, 0.9, 1] } : { scale: 1 }}
                className="flex"
                transition={ease(reduced, { duration: 0.4 })}
              >
                <Button data-pressed={pressing || undefined} size="sm">
                  Approve
                </Button>
              </motion.span>
            </motion.span>
          )}
        </AnimatePresence>
      </CardFooter>
    </Card>
  );
}

const STAGES = [
  { until: 35, label: "Writing the change" },
  { until: 70, label: "Running the tests" },
  { until: 100, label: "Deploying a preview" },
] as const;

/** Shipyard working through the request. */
function Working({ progress, reduced }: { progress: number; reduced: boolean }) {
  const done = progress >= 100;
  const stage = STAGES.find((candidate) => progress < candidate.until)?.label ?? "Preview deployed";
  return (
    <div className="flex flex-col gap-2.5">
      <span className="flex items-center gap-2 text-sm">
        <Status reduced={reduced} state={done ? "passed" : "running"} />
        {done ? "Built, tested and deployed" : "Working on #483"}
      </span>
      <Progress value={progress}>
        <ProgressTrack className="h-1 bg-foreground/10">
          <ProgressIndicator className="bg-foreground" />
        </ProgressTrack>
      </Progress>
      <span className="flex justify-between font-mono text-[11px] text-muted-foreground">
        <span>{stage}</span>
        <span>{progress}%</span>
      </span>
    </div>
  );
}

/** A small mock browser showing the bookings list with its new date filter. */
function Screenshot() {
  return (
    <div className="w-56 max-w-full overflow-hidden rounded-lg border bg-background shadow-xs/5">
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        <span className="size-1.5 rounded-full border" />
        <span className="size-1.5 rounded-full border" />
        <span className="size-1.5 rounded-full border" />
        <span className="ml-1 truncate rounded bg-muted px-1.5 font-mono text-[9px] text-muted-foreground">
          preview-483.shipyard.build/bookings
        </span>
      </div>
      <div className="flex flex-col gap-2 p-2.5">
        <div className="flex gap-1">
          {["This week", "Last 30 days", "Custom"].map((label, index) => (
            <span
              className={cn(
                "rounded-full border px-1.5 py-px text-[9px]",
                index === 0
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground",
              )}
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
        {[0.8, 0.6].map((width) => (
          <div className="flex items-center gap-2 rounded border px-2 py-1.5" key={width}>
            <span className="size-2.5 shrink-0 rounded-full bg-foreground/15" />
            <span
              className="h-1.5 rounded-full bg-foreground/20"
              style={{ width: `${width * 60}%` }}
            />
            <span className="ml-auto h-1.5 w-6 rounded-full bg-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
