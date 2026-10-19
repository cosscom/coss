/**
 * Compile-time contract for SMS (see contract-types.ts): the SDK's hand-written wire types are
 * exactly the API's zod schemas.
 */
import type {
  CreateSmsSuppressionRequest,
  DeletedSmsSuppression,
  ListReceivedSmsQuery,
  ListSmsQuery,
  ListSmsSuppressionsQuery,
  ReceivedSmsList,
  ReceivedSmsObject,
  ReceivedSmsWebhookEvent,
  SendSmsRequest,
  SmsEvent,
  SmsEventList,
  SmsList,
  SmsNumberList,
  SmsNumberObject,
  SmsObject,
  SmsSuppression,
  SmsSuppressionCheck,
  SmsSuppressionList,
  SmsWebhookEvent,
} from "@coss/sms/schemas";
import type {
  List,
  ListReceivedSmsParams,
  ListSmsParams,
  ListSmsSuppressionsParams,
  ReceivedSms,
  DeletedSmsSuppression as SdkDeletedSmsSuppression,
  ReceivedSmsWebhookEvent as SdkReceivedSmsWebhookEvent,
  SmsEvent as SdkSmsEvent,
  SmsSuppression as SdkSmsSuppression,
  SmsSuppressionCheck as SdkSmsSuppressionCheck,
  SmsWebhookEvent as SdkSmsWebhookEvent,
  SendSmsParams,
  Sms,
  SmsNumber,
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

export type SmsContract = [
  Assert<MutuallyAssignable<z.input<typeof SendSmsRequest>, SendSmsParams>>,
  Assert<MutuallyAssignable<z.output<typeof SmsObject>, Sms>>,
  Assert<MutuallyAssignable<z.output<typeof SmsList>, List<Sms>>>,
  Assert<MutuallyAssignable<z.output<typeof SmsEvent>, SdkSmsEvent>>,
  Assert<MutuallyAssignable<z.output<typeof SmsEventList>, List<SdkSmsEvent>>>,
  // List queries arrive as strings (the SDK sends numbers and arrays): only their keys must match.
  Assert<Equals<keyof z.input<typeof ListSmsQuery>, keyof ListSmsParams>>,
  Assert<MutuallyAssignable<z.output<typeof ReceivedSmsObject>, ReceivedSms>>,
  Assert<MutuallyAssignable<z.output<typeof ReceivedSmsList>, List<ReceivedSms>>>,
  Assert<Equals<keyof z.input<typeof ListReceivedSmsQuery>, keyof ListReceivedSmsParams>>,
  Assert<MutuallyAssignable<z.output<typeof SmsSuppression>, SdkSmsSuppression>>,
  Assert<MutuallyAssignable<z.output<typeof SmsSuppressionList>, List<SdkSmsSuppression>>>,
  Assert<MutuallyAssignable<z.output<typeof SmsSuppressionCheck>, SdkSmsSuppressionCheck>>,
  Assert<MutuallyAssignable<z.output<typeof DeletedSmsSuppression>, SdkDeletedSmsSuppression>>,
  Assert<MutuallyAssignable<z.input<typeof CreateSmsSuppressionRequest>, { phone_number: string }>>,
  Assert<Equals<keyof z.input<typeof ListSmsSuppressionsQuery>, keyof ListSmsSuppressionsParams>>,
  Assert<MutuallyAssignable<z.output<typeof SmsNumberObject>, SmsNumber>>,
  Assert<MutuallyAssignable<z.output<typeof SmsNumberList>, List<SmsNumber>>>,
  Assert<MutuallyAssignable<z.output<typeof SmsWebhookEvent>, SdkSmsWebhookEvent>>,
  Assert<MutuallyAssignable<z.output<typeof SmsWebhookEvent>["data"], SdkSmsWebhookEvent["data"]>>,
  Assert<MutuallyAssignable<z.output<typeof ReceivedSmsWebhookEvent>, SdkReceivedSmsWebhookEvent>>,
];
