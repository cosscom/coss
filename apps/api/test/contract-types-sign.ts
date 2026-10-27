/**
 * Compile-time contract for Sign (see contract-types.ts): the SDK's hand-written wire types are
 * exactly the API's zod schemas.
 */
import type {
  CreateSignBuilderSessionRequest,
  CreateSignRequestFromTemplateRequest,
  CreateSignRequestRequest,
  CreateSignSessionRequest,
  CreateSignTemplateRequest,
  DeletedSignDocument,
  DeletedSignTemplate,
  ListSignDocumentsQuery,
  ListSignRequestsQuery,
  ListSignTemplatesQuery,
  SignBuilderSessionObject,
  SignDocumentList,
  SignDocumentObject,
  SignEventList,
  SignEventObject,
  SignFieldInput,
  SignRequestList,
  SignRequestObject,
  SignRequestWebhookEvent,
  SignSessionObject,
  SignSettingsObject,
  SignTemplateList,
  SignTemplateObject,
  UpdateSignSettingsRequest,
  UpdateSignTemplateRequest,
  UploadSignDocumentRequest,
} from "@coss/sign/schemas";
import type {
  CreateSignBuilderSessionParams,
  CreateSignRequestFromTemplateParams,
  CreateSignRequestParams,
  CreateSignSessionParams,
  CreateSignTemplateParams,
  List,
  ListSignDocumentsParams,
  ListSignRequestsParams,
  ListSignTemplatesParams,
  DeletedSignDocument as SdkDeletedSignDocument,
  DeletedSignTemplate as SdkDeletedSignTemplate,
  SignFieldInput as SdkSignFieldInput,
  SignRequestWebhookEvent as SdkSignRequestWebhookEvent,
  SignBuilderSession,
  SignDocument,
  SignEvent,
  SignRequest,
  SignSession,
  SignSettings,
  SignTemplate,
  UpdateSignSettingsParams,
  UpdateSignTemplateParams,
  UploadSignDocumentParams,
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

export type SignContract = [
  Assert<MutuallyAssignable<z.input<typeof UploadSignDocumentRequest>, UploadSignDocumentParams>>,
  Assert<MutuallyAssignable<z.output<typeof SignDocumentObject>, SignDocument>>,
  Assert<MutuallyAssignable<z.output<typeof SignDocumentList>, List<SignDocument>>>,
  Assert<MutuallyAssignable<z.output<typeof DeletedSignDocument>, SdkDeletedSignDocument>>,
  Assert<MutuallyAssignable<z.input<typeof SignFieldInput>, SdkSignFieldInput>>,
  Assert<MutuallyAssignable<z.input<typeof CreateSignRequestRequest>, CreateSignRequestParams>>,
  Assert<MutuallyAssignable<z.output<typeof SignRequestObject>, SignRequest>>,
  Assert<MutuallyAssignable<z.output<typeof SignRequestList>, List<SignRequest>>>,
  Assert<MutuallyAssignable<z.output<typeof SignEventObject>, SignEvent>>,
  Assert<MutuallyAssignable<z.output<typeof SignEventList>, List<SignEvent>>>,
  Assert<MutuallyAssignable<z.input<typeof CreateSignSessionRequest>, CreateSignSessionParams>>,
  Assert<MutuallyAssignable<z.output<typeof SignSessionObject>, SignSession>>,
  Assert<MutuallyAssignable<z.output<typeof SignSettingsObject>, SignSettings>>,
  Assert<MutuallyAssignable<z.input<typeof UpdateSignSettingsRequest>, UpdateSignSettingsParams>>,
  Assert<MutuallyAssignable<z.output<typeof SignRequestWebhookEvent>, SdkSignRequestWebhookEvent>>,
  Assert<
    MutuallyAssignable<
      z.output<typeof SignRequestWebhookEvent>["data"],
      SdkSignRequestWebhookEvent["data"]
    >
  >,
  Assert<MutuallyAssignable<z.input<typeof CreateSignTemplateRequest>, CreateSignTemplateParams>>,
  Assert<MutuallyAssignable<z.input<typeof UpdateSignTemplateRequest>, UpdateSignTemplateParams>>,
  Assert<MutuallyAssignable<z.output<typeof SignTemplateObject>, SignTemplate>>,
  Assert<MutuallyAssignable<z.output<typeof SignTemplateList>, List<SignTemplate>>>,
  Assert<MutuallyAssignable<z.output<typeof DeletedSignTemplate>, SdkDeletedSignTemplate>>,
  Assert<
    MutuallyAssignable<
      z.input<typeof CreateSignRequestFromTemplateRequest>,
      CreateSignRequestFromTemplateParams
    >
  >,
  Assert<
    MutuallyAssignable<
      z.input<typeof CreateSignBuilderSessionRequest>,
      CreateSignBuilderSessionParams
    >
  >,
  Assert<MutuallyAssignable<z.output<typeof SignBuilderSessionObject>, SignBuilderSession>>,
  Assert<Equals<keyof z.input<typeof ListSignTemplatesQuery>, keyof ListSignTemplatesParams>>,
  // List queries arrive as strings (the SDK sends numbers and arrays): only their keys must match.
  Assert<Equals<keyof z.input<typeof ListSignDocumentsQuery>, keyof ListSignDocumentsParams>>,
  Assert<Equals<keyof z.input<typeof ListSignRequestsQuery>, keyof ListSignRequestsParams>>,
];
