/**
 * Compile-time contract for Sign (see contract-types.ts): the SDK's hand-written wire types are
 * exactly the API's zod schemas.
 */
import type {
  CreateSignRequestRequest,
  DeletedSignDocument,
  ListSignDocumentsQuery,
  ListSignRequestsQuery,
  SignDocumentList,
  SignDocumentObject,
  SignEventList,
  SignEventObject,
  SignFieldInput,
  SignRequestList,
  SignRequestObject,
  UploadSignDocumentRequest,
} from "@coss/sign/schemas";
import type {
  CreateSignRequestParams,
  List,
  ListSignDocumentsParams,
  ListSignRequestsParams,
  DeletedSignDocument as SdkDeletedSignDocument,
  SignFieldInput as SdkSignFieldInput,
  SignDocument,
  SignEvent,
  SignRequest,
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
  // List queries arrive as strings (the SDK sends numbers and arrays): only their keys must match.
  Assert<Equals<keyof z.input<typeof ListSignDocumentsQuery>, keyof ListSignDocumentsParams>>,
  Assert<Equals<keyof z.input<typeof ListSignRequestsQuery>, keyof ListSignRequestsParams>>,
];
