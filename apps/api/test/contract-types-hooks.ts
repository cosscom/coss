/**
 * Compile-time contract for Hooks (see contract-types.ts): the SDK's hand-written wire types are
 * exactly the API's zod schemas.
 */
import type {
  CreateHookApplicationRequest,
  CreateHookEndpointRequest,
  CreateHookEventTypeRequest,
  CreateHookPortalSessionRequest,
  DeletedHookApplication,
  DeletedHookEndpoint,
  HookApplicationList,
  HookApplicationObject,
  HookAttemptList,
  HookAttemptObject,
  HookDeliveryList,
  HookDeliveryObject,
  HookEndpointList,
  HookEndpointObject,
  HookEndpointRecoveryObject,
  HookEndpointSecret,
  HookEndpointWithSecret,
  HookEventTypeList,
  HookEventTypeObject,
  HookMessageList,
  HookMessageObject,
  HookPortalSessionObject,
  ListHookApplicationsQuery,
  ListHookDeliveriesQuery,
  ListHookEventTypesQuery,
  ListHookMessagesQuery,
  RecoverHookEndpointRequest,
  RollHookEndpointSecretRequest,
  SendHookMessageRequest,
  SendHookTestRequest,
  UpdateHookApplicationRequest,
  UpdateHookEndpointRequest,
  UpdateHookEventTypeRequest,
} from "@coss/hooks/schemas";
import type {
  CreateHookApplicationParams,
  CreateHookEndpointParams,
  CreateHookEventTypeParams,
  CreateHookPortalSessionParams,
  HookAttempt,
  HookDelivery,
  HookEndpoint,
  HookEndpointRecovery,
  HookEventType,
  HookMessage,
  HookPortalSession,
  List,
  ListHookApplicationsParams,
  ListHookDeliveriesParams,
  ListHookEventTypesParams,
  ListHookMessagesParams,
  RecoverHookEndpointParams,
  RollHookEndpointSecretParams,
  DeletedHookApplication as SdkDeletedHookApplication,
  DeletedHookEndpoint as SdkDeletedHookEndpoint,
  HookApplication as SdkHookApplication,
  HookEndpointSecret as SdkHookEndpointSecret,
  HookEndpointWithSecret as SdkHookEndpointWithSecret,
  SendHookMessageParams,
  SendHookTestParams,
  UpdateHookApplicationParams,
  UpdateHookEndpointParams,
  UpdateHookEventTypeParams,
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
// List queries arrive as strings (the SDK sends numbers and booleans): only their keys must match.

export type HooksContract = [
  Assert<MutuallyAssignable<z.output<typeof HookApplicationObject>, SdkHookApplication>>,
  Assert<MutuallyAssignable<z.output<typeof HookApplicationList>, List<SdkHookApplication>>>,
  Assert<
    MutuallyAssignable<z.input<typeof CreateHookApplicationRequest>, CreateHookApplicationParams>
  >,
  Assert<
    MutuallyAssignable<z.input<typeof UpdateHookApplicationRequest>, UpdateHookApplicationParams>
  >,
  Assert<MutuallyAssignable<z.output<typeof DeletedHookApplication>, SdkDeletedHookApplication>>,
  Assert<Equals<keyof z.input<typeof ListHookApplicationsQuery>, keyof ListHookApplicationsParams>>,
  Assert<MutuallyAssignable<z.output<typeof HookEventTypeObject>, HookEventType>>,
  Assert<MutuallyAssignable<z.output<typeof HookEventTypeList>, List<HookEventType>>>,
  Assert<MutuallyAssignable<z.input<typeof CreateHookEventTypeRequest>, CreateHookEventTypeParams>>,
  Assert<MutuallyAssignable<z.input<typeof UpdateHookEventTypeRequest>, UpdateHookEventTypeParams>>,
  Assert<Equals<keyof z.input<typeof ListHookEventTypesQuery>, keyof ListHookEventTypesParams>>,
  Assert<MutuallyAssignable<z.output<typeof HookEndpointObject>, HookEndpoint>>,
  Assert<MutuallyAssignable<z.output<typeof HookEndpointWithSecret>, SdkHookEndpointWithSecret>>,
  Assert<MutuallyAssignable<z.output<typeof HookEndpointList>, List<HookEndpoint>>>,
  Assert<MutuallyAssignable<z.output<typeof DeletedHookEndpoint>, SdkDeletedHookEndpoint>>,
  Assert<MutuallyAssignable<z.output<typeof HookEndpointSecret>, SdkHookEndpointSecret>>,
  Assert<MutuallyAssignable<z.input<typeof CreateHookEndpointRequest>, CreateHookEndpointParams>>,
  Assert<MutuallyAssignable<z.input<typeof UpdateHookEndpointRequest>, UpdateHookEndpointParams>>,
  Assert<
    MutuallyAssignable<z.input<typeof RollHookEndpointSecretRequest>, RollHookEndpointSecretParams>
  >,
  // The SDK also accepts a `Date` for `since`.
  Assert<
    MutuallyAssignable<
      z.input<typeof RecoverHookEndpointRequest>,
      Omit<RecoverHookEndpointParams, "since"> & { since: string }
    >
  >,
  Assert<MutuallyAssignable<z.output<typeof HookEndpointRecoveryObject>, HookEndpointRecovery>>,
  Assert<MutuallyAssignable<z.input<typeof SendHookTestRequest>, SendHookTestParams>>,
  Assert<MutuallyAssignable<z.output<typeof HookMessageObject>, HookMessage>>,
  Assert<MutuallyAssignable<z.output<typeof HookMessageList>, List<HookMessage>>>,
  // `messages.send({ application, ...body })`: the application goes in the path.
  Assert<
    MutuallyAssignable<
      z.input<typeof SendHookMessageRequest>,
      Omit<SendHookMessageParams, "application">
    >
  >,
  Assert<Equals<keyof z.input<typeof ListHookMessagesQuery>, keyof ListHookMessagesParams>>,
  Assert<MutuallyAssignable<z.output<typeof HookDeliveryObject>, HookDelivery>>,
  Assert<MutuallyAssignable<z.output<typeof HookDeliveryList>, List<HookDelivery>>>,
  Assert<Equals<keyof z.input<typeof ListHookDeliveriesQuery>, keyof ListHookDeliveriesParams>>,
  Assert<MutuallyAssignable<z.output<typeof HookAttemptObject>, HookAttempt>>,
  Assert<MutuallyAssignable<z.output<typeof HookAttemptList>, List<HookAttempt>>>,
  Assert<
    MutuallyAssignable<
      z.input<typeof CreateHookPortalSessionRequest>,
      Omit<CreateHookPortalSessionParams, "application">
    >
  >,
  Assert<MutuallyAssignable<z.output<typeof HookPortalSessionObject>, HookPortalSession>>,
];
