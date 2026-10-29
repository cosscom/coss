/**
 * Compile-time contract for inboxes (see contract-types.ts): the SDK's hand-written wire types are
 * exactly the API's zod schemas.
 */
import type {
  CreateInboxRequest,
  DeletedInbox,
  DeletedInboxThread,
  InboxList,
  InboxMessageList,
  InboxMessageObject,
  InboxMessageReceivedWebhookEvent,
  InboxMessageSummary,
  InboxObject,
  InboxThreadList,
  InboxThreadObject,
  InboxThreadSummary,
  ListInboxesQuery,
  ListInboxMessagesQuery,
  ListInboxThreadsQuery,
  ReplyInboxMessageRequest,
  SendInboxMessageRequest,
  UpdateInboxRequest,
} from "@coss/email/inbox-schemas";
import type {
  CreateInboxParams,
  Inbox,
  InboxMessage,
  InboxThread,
  List,
  ListInboxesParams,
  ListInboxMessagesParams,
  ListInboxThreadsParams,
  ReplyInboxMessageParams,
  DeletedInbox as SdkDeletedInbox,
  DeletedInboxThread as SdkDeletedInboxThread,
  InboxMessageReceivedWebhookEvent as SdkInboxMessageReceivedWebhookEvent,
  InboxMessageSummary as SdkInboxMessageSummary,
  InboxThreadSummary as SdkInboxThreadSummary,
  SendInboxMessageParams,
  UpdateInboxParams,
} from "coss";
import type { z } from "zod";

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type MutuallyAssignable<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? Equals<keyof A, keyof B>
    : false
  : false;
type Assert<T extends true> = T;

export type InboxContract = [
  Assert<MutuallyAssignable<z.input<typeof CreateInboxRequest>, CreateInboxParams>>,
  Assert<MutuallyAssignable<z.input<typeof UpdateInboxRequest>, UpdateInboxParams>>,
  Assert<MutuallyAssignable<z.output<typeof InboxObject>, Inbox>>,
  Assert<MutuallyAssignable<z.output<typeof InboxList>, List<Inbox>>>,
  Assert<MutuallyAssignable<z.output<typeof DeletedInbox>, SdkDeletedInbox>>,
  Assert<MutuallyAssignable<z.output<typeof InboxMessageSummary>, SdkInboxMessageSummary>>,
  Assert<MutuallyAssignable<z.output<typeof InboxMessageObject>, InboxMessage>>,
  Assert<MutuallyAssignable<z.output<typeof InboxMessageList>, List<SdkInboxMessageSummary>>>,
  Assert<MutuallyAssignable<z.output<typeof InboxThreadSummary>, SdkInboxThreadSummary>>,
  Assert<MutuallyAssignable<z.output<typeof InboxThreadObject>, InboxThread>>,
  Assert<MutuallyAssignable<z.output<typeof InboxThreadList>, List<SdkInboxThreadSummary>>>,
  Assert<MutuallyAssignable<z.output<typeof DeletedInboxThread>, SdkDeletedInboxThread>>,
  Assert<MutuallyAssignable<z.input<typeof SendInboxMessageRequest>, SendInboxMessageParams>>,
  Assert<MutuallyAssignable<z.input<typeof ReplyInboxMessageRequest>, ReplyInboxMessageParams>>,
  Assert<
    MutuallyAssignable<
      z.output<typeof InboxMessageReceivedWebhookEvent>,
      SdkInboxMessageReceivedWebhookEvent
    >
  >,
  Assert<
    MutuallyAssignable<
      z.output<typeof InboxMessageReceivedWebhookEvent>["data"],
      SdkInboxMessageReceivedWebhookEvent["data"]
    >
  >,
  // List queries arrive as strings (the SDK sends numbers): only their keys must match.
  Assert<Equals<keyof z.input<typeof ListInboxesQuery>, keyof ListInboxesParams>>,
  Assert<Equals<keyof z.input<typeof ListInboxThreadsQuery>, keyof ListInboxThreadsParams>>,
  Assert<Equals<keyof z.input<typeof ListInboxMessagesQuery>, keyof ListInboxMessagesParams>>,
];
