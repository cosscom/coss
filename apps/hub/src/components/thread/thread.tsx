"use client";

import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import { ChatCollapsibleMessage } from "@coss/ui/components/chat/chat-collapsible-message";
import { ChatDatePill } from "@coss/ui/components/chat/chat-date-pill";
import { ChatDeliveryIndicator } from "@coss/ui/components/chat/chat-delivery-indicator";
import { ChatMemberList } from "@coss/ui/components/chat/chat-members";
import { ChatMessage } from "@coss/ui/components/chat/chat-message";
import { ChatMessageActionToolbar } from "@coss/ui/components/chat/chat-message-actions";
import { ChatMessageInfo } from "@coss/ui/components/chat/chat-message-info";
import { ChatMessageText } from "@coss/ui/components/chat/chat-message-text";
import { ChatReactionChip } from "@coss/ui/components/chat/chat-reaction-chip";
import { ChatReactionPicker } from "@coss/ui/components/chat/chat-reaction-picker";
import {
  ChatReplyPreview,
  type ChatReplyTarget,
} from "@coss/ui/components/chat/chat-reply-preview";
import { ChatReplyReference } from "@coss/ui/components/chat/chat-reply-reference";
import { ChatEmptyState, ChatStatusBar } from "@coss/ui/components/chat/chat-states";
import { ChatTypingIndicator } from "@coss/ui/components/chat/chat-typing-indicator";
import { ChatUnreadDivider } from "@coss/ui/components/chat/chat-unread-divider";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { MenuItem } from "@coss/ui/components/menu";
import { Progress, ProgressIndicator, ProgressTrack } from "@coss/ui/components/progress";
import { cn } from "@coss/ui/lib/utils";
import {
  CheckCheckIcon,
  CheckCircle2Icon,
  CircleSlashIcon,
  CopyIcon,
  ExternalLinkIcon,
  EyeIcon,
  InfoIcon,
  LinkIcon,
  MessageSquareIcon,
  PaperclipIcon,
  SendIcon,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useMemo, useRef, useState, useTransition } from "react";
import { reactToComment } from "@/app/[owner]/[project]/prompts/[number]/actions";
import { long, relative } from "@/lib/format";
import { StatusBadge } from "../status-badge";
import { ApprovalCard } from "./approval-card";
import { FactoryAvatar, HubAvatar, PersonAvatar } from "./avatars";
import { ThreadComposer } from "./reply-box";
import type { CommentView, ThreadView } from "./view";

/*
 * The thread on coss ui's chat: date pills, the unread divider, grouped messages, read receipts,
 * reactions, the action toolbar (react, reply, more), reply references and the reply preview,
 * collapsible long messages, the typing indicator while the factory works, status bars, the
 * empty state. The page scrolls, like GitHub's, with the composer pinned to the bottom.
 */

const REACTIONS = [
  { emoji: "👍", label: "Thumbs up" },
  { emoji: "❤️", label: "Heart" },
  { emoji: "🚀", label: "Ship it" },
  { emoji: "👀", label: "Eyes" },
  { emoji: "🎉", label: "Party" },
] as const;

const GROUP_MS = 5 * 60_000;
const COLLAPSE_AT = 420;

type Item =
  | { type: "date"; key: string; label: string }
  | { type: "unread"; key: string }
  | { type: "request"; key: string }
  | { type: "comment"; key: string; comment: CommentView; depth: number; grouped: boolean };

const DAY = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });

function dayLabel(date: Date, now = new Date()): string {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - new Date(date).setHours(0, 0, 0, 0)) / 86_400_000);
  return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : DAY.format(date);
}

/** The request, then every top-level comment with its replies, with day pills and the unread line. */
function items(view: ThreadView): Item[] {
  const out: Item[] = [];
  let lastDay = "";
  let unreadPlaced = view.lastReadBefore === null;
  const lastRead = view.lastReadBefore ? new Date(view.lastReadBefore).getTime() : 0;
  const place = (at: string, key: string) => {
    const date = new Date(at);
    const label = dayLabel(date);
    if (label !== lastDay) {
      out.push({ type: "date", key: `day-${key}`, label });
      lastDay = label;
    }
    if (!unreadPlaced && date.getTime() > lastRead) {
      out.push({ type: "unread", key: `unread-${key}` });
      unreadPlaced = true;
    }
  };
  place(view.createdAt, "request");
  out.push({ type: "request", key: "request" });
  const byParent = new Map<string | null, CommentView[]>();
  for (const comment of view.comments) {
    const list = byParent.get(comment.parentId) ?? [];
    list.push(comment);
    byParent.set(comment.parentId, list);
  }
  const walk = (parentId: string | null, depth: number) => {
    const list = byParent.get(parentId) ?? [];
    list.forEach((comment, index) => {
      if (depth === 0) place(comment.createdAt, comment.id);
      const previous = list[index - 1];
      const grouped =
        comment.kind === "comment" &&
        previous?.kind === "comment" &&
        previous.author === comment.author &&
        new Date(comment.createdAt).getTime() - new Date(previous.createdAt).getTime() < GROUP_MS &&
        !(byParent.get(previous.id)?.length ?? 0);
      out.push({ type: "comment", key: comment.id, comment, depth, grouped });
      walk(comment.id, depth + 1);
    });
  };
  walk(null, 0);
  return out;
}

export function Thread({ view }: { view: ThreadView }) {
  const router = useRouter();
  const list = useMemo(() => items(view), [view]);
  const [replyTo, setReplyTo] = useState<{ comment: CommentView; target: ChatReplyTarget } | null>(
    null,
  );
  const dismissalRef = useRef<"cancel" | "send">("cancel");
  const [info, setInfo] = useState<CommentView | null>(null);
  const [, start] = useTransition();
  const target = { owner: view.owner, project: view.project, number: view.number };
  const building = view.status === "building";

  const person = (handle: string) =>
    view.people[handle] ?? {
      handle,
      name: handle,
      avatarUrl: null,
      initials: handle.slice(0, 2).toUpperCase(),
    };
  const name = (handle: string) =>
    handle === "hub"
      ? "coss.com hub"
      : handle === "factory"
        ? view.factoryName
        : person(handle).name;

  const react = (comment: CommentView, emoji: string) =>
    start(async () => {
      await reactToComment({ ...target, commentId: comment.id, emoji });
      router.refresh();
    });

  const beginReply = (comment: CommentView) => {
    const bubble = document
      .getElementById(`comment-${comment.id}`)
      ?.querySelector<HTMLDivElement>("[data-slot=chat-message-bubble]");
    if (!bubble) return;
    dismissalRef.current = "cancel";
    setReplyTo({
      comment,
      target: { source: bubble, width: bubble.offsetWidth, firstInGroup: true },
    });
  };

  /** Who has read the thread since this comment was written (its "read" receipt). */
  const readBy = (comment: CommentView) =>
    Object.entries(view.reads)
      .filter(
        ([handle, at]) =>
          handle !== comment.author &&
          new Date(at).getTime() >= new Date(comment.createdAt).getTime(),
      )
      .map(([handle]) => handle);

  const placeholder =
    view.status === "needs_context" && view.author === view.viewer
      ? "Answer the hub's questions…"
      : building && view.maintainer
        ? `Comment, or reply under one of ${view.factoryName}'s updates to steer it…`
        : "Comment…";

  return (
    <div className="flex min-h-[calc(100dvh-var(--header-height)-11rem)] flex-col gap-4">
      <div className="flex flex-col gap-4">
        {list.map((item) => {
          if (item.type === "date") return <ChatDatePill key={item.key}>{item.label}</ChatDatePill>;
          if (item.type === "unread") {
            return (
              <ChatUnreadDivider className="my-0" key={item.key}>
                New since your last visit
              </ChatUnreadDivider>
            );
          }
          if (item.type === "request") {
            const own = view.author === view.viewer;
            return (
              <ChatMessage
                author={
                  <Author
                    at={view.createdAt}
                    name={name(view.author)}
                    handle={view.author}
                    tag="author"
                  />
                }
                avatar={<PersonAvatar person={person(view.author)} />}
                bubbleProps={{ className: cn("max-w-full", !own && "bg-foreground/4") }}
                footer={
                  <>
                    <span>Prompt Request #{view.number} opened · 0 lines of code</span>
                    {own && (
                      <Receipt
                        readBy={readBy({
                          author: view.author,
                          createdAt: view.createdAt,
                        } as CommentView)}
                        name={name}
                      />
                    )}
                  </>
                }
                id="comment-request"
                key={item.key}
                side="incoming"
              >
                <Body text={view.body} mentions={view.participants} />
                {view.attachments.length > 0 && <Attachments items={view.attachments} />}
              </ChatMessage>
            );
          }
          return (
            <CommentItem
              building={building}
              comment={item.comment}
              depth={item.depth}
              grouped={item.grouped}
              key={item.key}
              name={name}
              onInfo={() => setInfo(item.comment)}
              onReact={(emoji) => react(item.comment, emoji)}
              onReply={() => beginReply(item.comment)}
              parent={
                item.comment.parentId
                  ? (view.comments.find((c) => c.id === item.comment.parentId) ?? null)
                  : null
              }
              person={person}
              readBy={readBy(item.comment)}
              view={view}
            />
          );
        })}
        {view.comments.length === 0 && view.status !== "awaiting_review" && !building && (
          <ChatEmptyState
            description="Be the first. The author, the maintainers and the factory all read this thread."
            icon={<MessageSquareIcon aria-hidden />}
            title="No comments yet"
          />
        )}
        {view.status === "awaiting_review" &&
          (view.maintainer ? (
            <ChatMessage
              author={<span className="text-foreground">Your decision</span>}
              avatar={<PersonAvatar person={person(view.viewer ?? "")} />}
              bubble={false}
              side="incoming"
            >
              <ApprovalCard
                author={view.author}
                kind={view.kind}
                target={target}
                title={view.title}
              />
            </ChatMessage>
          ) : (
            <Card className="w-full max-w-xl">
              <CardHeader className="p-4">
                <CardTitle className="text-sm">Waiting for a maintainer</CardTitle>
                <CardDescription className="flex items-center gap-2 text-xs">
                  One of
                  <span className="flex -space-x-1.5">
                    {view.maintainers.map((handle) => (
                      <PersonAvatar className="size-5" key={handle} person={person(handle)} />
                    ))}
                  </span>
                  approves or declines, with a comment either way.
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        {building && (
          <div className="flex flex-col gap-2">
            <ChatTypingIndicator label={`${view.factoryName} is working on #${view.number}…`} />
            {view.build?.progress !== null && view.build?.progress !== undefined && (
              <div className="flex w-72 max-w-full items-center gap-3 ps-9">
                <Progress value={view.build.progress}>
                  <ProgressTrack className="h-1 bg-foreground/10">
                    <ProgressIndicator className="bg-foreground" />
                  </ProgressTrack>
                </Progress>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {view.build.progress}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Pinned to the bottom of the viewport; the reply preview floats over it. */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-auto bg-background lg:mx-0">
        <div className="relative isolate overflow-hidden rounded-t-xl border border-b-0 bg-popover">
          <AnimatePresence>
            {replyTo && (
              <ChatReplyPreview
                author={name(replyTo.comment.author)}
                avatar={
                  <Avatar
                    handle={replyTo.comment.author}
                    factoryName={view.factoryName}
                    people={view.people}
                  />
                }
                cancelLabel="Cancel reply"
                dismissalRef={dismissalRef}
                key={replyTo.comment.id}
                onCancel={() => {
                  dismissalRef.current = "cancel";
                  setReplyTo(null);
                }}
                replyLabel={`Replying to ${name(replyTo.comment.author)}`}
                side="incoming"
                target={replyTo.target}
              >
                <ChatMessageText mentions={view.participants} text={replyTo.comment.body} />
              </ChatReplyPreview>
            )}
          </AnimatePresence>
          <StatusBar view={view} name={name} />
          <div className="px-3 py-3">
            {view.viewer === null ? (
              <p className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-muted-foreground text-sm">
                Sign in to comment, react or open a prompt request.
                <Button
                  render={
                    <Link
                      href={`/sign-in?next=/${view.owner}/${view.project}/prompts/${view.number}`}
                    />
                  }
                  size="sm"
                >
                  Sign in
                </Button>
              </p>
            ) : (
              <ThreadComposer
                autoFocus={replyTo !== null}
                key={replyTo?.comment.id ?? "top"}
                onSent={() => {
                  dismissalRef.current = "send";
                  setReplyTo(null);
                }}
                parentId={replyTo?.comment.id ?? null}
                placeholder={replyTo ? `Reply to ${name(replyTo.comment.author)}…` : placeholder}
                target={target}
              />
            )}
          </div>
        </div>
      </div>
      <Dialog onOpenChange={(open) => !open && setInfo(null)} open={info !== null}>
        <DialogPopup className="max-w-md">
          <DialogHeader>
            <DialogTitle>Message info</DialogTitle>
            <DialogDescription>Who has seen this message.</DialogDescription>
          </DialogHeader>
          <DialogPanel>
            {info && (
              <ChatMessageInfo
                groups={[
                  {
                    id: "read",
                    label: "Read by",
                    icon: <CheckCheckIcon aria-hidden className="size-3.5" />,
                    members: readBy(info).map((handle) => ({
                      id: handle,
                      name: name(handle),
                      avatar: <PersonAvatar className="size-6" person={person(handle)} />,
                      badges: (
                        <span className="text-muted-foreground text-xs">
                          {relative(new Date(view.reads[handle] ?? info.createdAt))}
                        </span>
                      ),
                    })),
                  },
                  {
                    id: "delivered",
                    label: "Delivered to",
                    icon: <EyeIcon aria-hidden className="size-3.5" />,
                    members: view.participants
                      .filter((handle) => handle !== info.author && !readBy(info).includes(handle))
                      .map((handle) => ({
                        id: handle,
                        name: name(handle),
                        avatar: <PersonAvatar className="size-6" person={person(handle)} />,
                        dimmed: true,
                      })),
                  },
                ]}
                message={
                  <div className="rounded-2xl bg-foreground/4 px-3.5 py-2.5">
                    <Body text={info.body} mentions={view.participants} />
                  </div>
                }
                metadata={`${name(info.author)} · ${long(new Date(info.createdAt))}`}
              />
            )}
          </DialogPanel>
        </DialogPopup>
      </Dialog>
    </div>
  );
}

function CommentItem({
  view,
  comment,
  depth,
  grouped,
  parent,
  person,
  name,
  readBy,
  building,
  onReply,
  onReact,
  onInfo,
}: {
  view: ThreadView;
  comment: CommentView;
  depth: number;
  grouped: boolean;
  parent: CommentView | null;
  person: (handle: string) => ThreadView["people"][string];
  name: (handle: string) => string;
  readBy: string[];
  building: boolean;
  onReply: () => void;
  onReact: (emoji: string) => void;
  onInfo: () => void;
}) {
  const own = comment.author === view.viewer;
  const mine = view.viewer
    ? comment.reactions.filter((r) => r.by.includes(view.viewer as string)).map((r) => r.emoji)
    : [];
  const indent = depth > 0 ? "ms-4 border-s ps-4 sm:ms-9" : "";

  const reference = parent && (
    <ChatReplyReference
      author={name(parent.author)}
      className="mb-1"
      onClick={() =>
        document
          .getElementById(`comment-${parent.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" })
      }
      preview={parent.kind === "triage" ? "More context needed" : parent.body}
    />
  );

  const actions =
    view.viewer === null ? undefined : (
      <ChatMessageActionToolbar
        menuChildren={
          <>
            <MenuItem onClick={() => navigator.clipboard?.writeText(comment.body)}>
              <CopyIcon aria-hidden /> Copy text
            </MenuItem>
            <MenuItem
              onClick={() =>
                navigator.clipboard?.writeText(
                  `${window.location.origin}${window.location.pathname}#comment-${comment.id}`,
                )
              }
            >
              <LinkIcon aria-hidden /> Copy link
            </MenuItem>
            <MenuItem onClick={onInfo}>
              <InfoIcon aria-hidden /> Message info
            </MenuItem>
            {building && view.maintainer && comment.kind === "factory" && (
              <MenuItem onClick={onReply}>
                <SendIcon aria-hidden /> Steer {view.factoryName}
              </MenuItem>
            )}
          </>
        }
        moreLabel="More"
        moreTooltip="More"
        onReply={onReply}
        reactionPicker={(toolbarRef) => (
          <ChatReactionPicker
            inToolbar
            onSelect={onReact}
            options={REACTIONS}
            popupAnchor={toolbarRef}
            popupLabel="React"
            selectedEmojis={mine}
            triggerLabel="React"
            triggerTooltip="React"
          />
        )}
        replyLabel="Reply"
        replyTooltip="Reply"
        side="incoming"
        toolbarLabel="Message actions"
      />
    );

  const reactions =
    comment.reactions.length > 0
      ? comment.reactions.map((reaction) => (
          <ChatReactionChip
            count={reaction.by.length}
            emoji={reaction.emoji}
            key={reaction.emoji}
            label={`${reaction.emoji} ${reaction.by.length}`}
            onClick={() => onReact(reaction.emoji)}
            reactorContent={
              <ChatMemberList
                members={reaction.by.map((handle) => ({
                  id: handle,
                  name: name(handle),
                  avatar: <PersonAvatar className="size-5" person={person(handle)} />,
                }))}
              />
            }
            reactorLabel={reaction.by.map(name).join(", ")}
            selected={view.viewer !== null && reaction.by.includes(view.viewer)}
          />
        ))
      : undefined;

  const footer = (
    <>
      <time dateTime={comment.createdAt} title={long(new Date(comment.createdAt))}>
        {relative(new Date(comment.createdAt))}
      </time>
      {own && <Receipt readBy={readBy} name={name} />}
    </>
  );

  if (comment.kind === "system") {
    return (
      <div className={indent} id={`comment-${comment.id}`}>
        <ChatUnreadDivider className="my-0 font-mono font-normal text-muted-foreground">
          <span className="flex items-center gap-2">
            {comment.body}
            {comment.link && (
              <a
                className="flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
                href={comment.link.href}
                rel="noreferrer"
                target="_blank"
              >
                {comment.link.label}
                <ExternalLinkIcon aria-hidden className="size-3" />
              </a>
            )}
            <time className="text-muted-foreground/70" dateTime={comment.createdAt}>
              {relative(new Date(comment.createdAt))}
            </time>
          </span>
        </ChatUnreadDivider>
      </div>
    );
  }

  if (comment.kind === "triage") {
    return (
      <div className={indent} id={`comment-${comment.id}`}>
        <ChatMessage
          actions={actions}
          author={<Author at={comment.createdAt} handle="hub" name="coss.com hub" tag="triage" />}
          avatar={<HubAvatar />}
          bubble={false}
          footer={footer}
          reactions={reactions}
          side="incoming"
        >
          <Card className="w-full max-w-xl">
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-sm">More context needed</CardTitle>
              <CardDescription className="text-xs">
                Checked by {view.triageModel ?? "the hub"} · not enough yet to brief{" "}
                {view.factoryName}
              </CardDescription>
            </CardHeader>
            <CardPanel className="flex flex-col gap-3 p-4">
              <ChatMessageText mentions={view.participants} text={comment.body} />
              <ol className="flex list-decimal flex-col gap-1.5 ps-5 text-sm">
                {comment.questions?.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ol>
              <p className="text-muted-foreground text-xs">
                Reply in the thread. The hub reads every answer from @{view.author} and hands the
                request to a maintainer as soon as it's enough.
              </p>
            </CardPanel>
          </Card>
        </ChatMessage>
      </div>
    );
  }

  if (comment.kind === "decision") {
    const approved = view.decision?.decision !== "declined";
    return (
      <div className={indent} id={`comment-${comment.id}`}>
        <ChatMessage
          actions={actions}
          author={
            <Author
              at={comment.createdAt}
              handle={comment.author}
              name={name(comment.author)}
              tag="maintainer"
            />
          }
          avatar={<PersonAvatar person={person(comment.author)} />}
          bubble={false}
          footer={footer}
          reactions={reactions}
          side="incoming"
        >
          <Card className="w-full max-w-xl">
            <CardHeader className="p-4 pb-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                {approved ? (
                  <CheckCircle2Icon
                    aria-hidden
                    className="size-4 text-green-600 dark:text-green-400"
                  />
                ) : (
                  <CircleSlashIcon aria-hidden className="size-4 text-red-600 dark:text-red-400" />
                )}
                {approved ? "Approved" : "Declined"} by {name(comment.author)}
              </CardTitle>
              <CardDescription className="text-xs">
                {long(new Date(comment.createdAt))}
              </CardDescription>
            </CardHeader>
            <CardPanel className="p-4">
              <blockquote className="border-s-2 ps-3 text-sm leading-snug">
                <ChatMessageText mentions={view.participants} text={comment.body} />
              </blockquote>
            </CardPanel>
          </Card>
        </ChatMessage>
      </div>
    );
  }

  if (comment.kind === "factory") {
    return (
      <div className={indent} id={`comment-${comment.id}`}>
        <ChatMessage
          actions={actions}
          author={
            <Author at={comment.createdAt} handle="factory" name={view.factoryName} tag="factory" />
          }
          avatar={<FactoryAvatar name={view.factoryName} />}
          bubbleProps={{ className: "max-w-full" }}
          footer={
            <>
              {footer}
              <ChatDeliveryIndicator label="Delivered" status="delivered" />
            </>
          }
          reactions={reactions}
          side="incoming"
        >
          {reference}
          <ChatMessageText mentions={view.participants} text={comment.body} />
          {comment.link && (
            <Button
              className="w-fit"
              render={<a href={comment.link.href} rel="noreferrer" target="_blank" />}
              size="xs"
              variant="outline"
            >
              <ExternalLinkIcon aria-hidden />
              {comment.link.label}
              <span className="font-mono text-muted-foreground">
                {comment.link.href.replace(/^https:\/\//, "")}
              </span>
            </Button>
          )}
        </ChatMessage>
      </div>
    );
  }

  return (
    <div className={indent} id={`comment-${comment.id}`}>
      <ChatMessage
        actions={actions}
        author={
          <Author
            at={comment.createdAt}
            handle={comment.author}
            name={name(comment.author)}
            tag={
              comment.author === view.author
                ? "author"
                : view.maintainers.includes(comment.author)
                  ? "maintainer"
                  : undefined
            }
          />
        }
        avatar={<PersonAvatar person={person(comment.author)} />}
        bubbleProps={{ className: cn("max-w-full", !own && "bg-foreground/4") }}
        footer={grouped ? undefined : footer}
        grouped={grouped}
        reactions={reactions}
        side="incoming"
      >
        {reference}
        <Body text={comment.body} mentions={view.participants} />
      </ChatMessage>
    </div>
  );
}

/** What the author attached: images as thumbnails that open full size, the rest as file links. */
function Attachments({ items }: { items: ThreadView["attachments"] }) {
  return (
    <ul className="flex flex-wrap gap-2 pt-1">
      {items.map((item) => (
        <li key={item.id}>
          <a
            className="flex items-center gap-2 rounded-lg border bg-background/60 p-1 pe-2 text-xs hover:border-foreground/40"
            href={`/attachments/${item.id}`}
            rel="noreferrer"
            target="_blank"
          >
            {item.type.startsWith("image/") ? (
              // biome-ignore lint/performance/noImgElement: served by the hub itself.
              <img
                alt={item.name}
                className="size-16 rounded-md object-cover"
                src={`/attachments/${item.id}`}
              />
            ) : (
              <span className="flex size-10 items-center justify-center rounded-md bg-muted">
                <PaperclipIcon aria-hidden className="size-4" />
              </span>
            )}
            <span className="max-w-40 truncate">{item.name}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** A long body folds; a short one is plain text with mentions. */
function Body({ text, mentions }: { text: string; mentions: string[] }) {
  if (text.length <= COLLAPSE_AT) return <ChatMessageText mentions={mentions} text={text} />;
  return (
    <ChatCollapsibleMessage
      maxPreviewLength={COLLAPSE_AT}
      renderText={(part) => <ChatMessageText mentions={mentions} text={part} />}
      showLessLabel="Show less"
      showMoreLabel="Show more"
      side="incoming"
      text={text}
    />
  );
}

/** The read receipt of the viewer's own message: who has read it since. */
function Receipt({ readBy, name }: { readBy: string[]; name: (handle: string) => string }) {
  const label = readBy.length > 0 ? `Read by ${readBy.map(name).join(", ")}` : "Delivered";
  return <ChatDeliveryIndicator label={label} status={readBy.length > 0 ? "read" : "delivered"} />;
}

function Author({
  handle,
  name,
  at,
  tag,
}: {
  handle: string;
  name: string;
  at: string;
  tag?: string;
}) {
  return (
    <span className="flex flex-wrap items-center gap-x-2">
      {handle === "hub" || handle === "factory" ? (
        <span className="text-foreground">{name}</span>
      ) : (
        <Link className="text-foreground hover:underline" href={`/${handle}`}>
          {name}
        </Link>
      )}
      {tag && (
        <span className="rounded-full border px-1.5 font-mono text-[10px] uppercase tracking-wide">
          {tag}
        </span>
      )}
      <time dateTime={at} title={long(new Date(at))}>
        {relative(new Date(at))}
      </time>
    </span>
  );
}

function Avatar({
  handle,
  factoryName,
  people,
}: {
  handle: string;
  factoryName: string;
  people: ThreadView["people"];
}) {
  if (handle === "hub") return <HubAvatar />;
  if (handle === "factory") return <FactoryAvatar name={factoryName} />;
  const person = people[handle] ?? {
    handle,
    name: handle,
    avatarUrl: null,
    initials: handle.slice(0, 2).toUpperCase(),
  };
  return <PersonAvatar person={person} />;
}

/** The thread's state, where a chat shows its connection: what happens next and where. */
function StatusBar({
  view,
  name,
}: {
  view: ThreadView;
  name: (handle: string) => string;
}): ReactNode {
  const link = (href: string, label: string) => (
    <Button render={<a href={href} rel="noreferrer" target="_blank" />} size="xs" variant="outline">
      {label}
      <ExternalLinkIcon aria-hidden />
    </Button>
  );
  switch (view.status) {
    case "needs_context":
      return (
        <ChatStatusBar
          action={<StatusBadge status="needs_context" />}
          description={
            view.author === view.viewer
              ? "Answer the hub's questions below; a maintainer sees it once it's enough."
              : `Waiting for @${view.author} to add context.`
          }
          title="The hub needs more to go on"
        />
      );
    case "awaiting_review":
      return (
        <ChatStatusBar
          action={<StatusBadge status="awaiting_review" />}
          description={`${view.maintainers.map(name).slice(0, 3).join(", ")} decide, with a comment either way.`}
          title="Waiting for a maintainer"
        />
      );
    case "building":
      return (
        <ChatStatusBar
          action={view.build ? link(view.build.sessionUrl, "Session") : undefined}
          description={
            view.maintainer
              ? "Reply under one of its updates to steer it."
              : "Its updates land here as it works."
          }
          title={`${view.factoryName} is working on #${view.number}`}
        />
      );
    case "in_production":
      return (
        <ChatStatusBar
          action={view.build?.productionUrl ? link(view.build.productionUrl, "Open") : undefined}
          description={
            view.build?.previewUrl
              ? `Preview at ${view.build.previewUrl.replace(/^https:\/\//, "")}.`
              : "Built, tested and shipped."
          }
          title="In production"
        />
      );
    case "declined":
      return (
        <ChatStatusBar
          action={<StatusBadge status="declined" />}
          description={
            view.decision ? `By ${name(view.decision.by)}: ${view.decision.comment}` : ""
          }
          title="Declined"
        />
      );
    case "failed":
      return (
        <ChatStatusBar
          action={<StatusBadge status="failed" />}
          description="A maintainer can approve it again."
          title={`${view.factoryName} stopped without shipping`}
        />
      );
    default:
      return null;
  }
}
