/**
 * Compile-time contract for Forms (see contract-types.ts): the SDK's hand-written wire types are
 * the API's zod schemas.
 */
import type {
  CreateFormRequest,
  DeletedForm,
  DeletedFormSubmission,
  FormList,
  FormObject,
  FormSubmissionList,
  FormSubmissionObject,
  FormSubmissionWebhookEvent,
  ListFormSubmissionsQuery,
  ListFormsQuery,
  UpdateFormRequest,
} from "@coss/forms/schemas";
import type {
  CreateFormParams,
  Form,
  FormSubmission,
  List,
  ListFormSubmissionsParams,
  ListFormsParams,
  DeletedForm as SdkDeletedForm,
  DeletedFormSubmission as SdkDeletedFormSubmission,
  FormSubmissionWebhookEvent as SdkFormSubmissionWebhookEvent,
  UpdateFormParams,
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

export type FormsContract = [
  Assert<MutuallyAssignable<z.input<typeof CreateFormRequest>, CreateFormParams>>,
  Assert<MutuallyAssignable<z.input<typeof UpdateFormRequest>, UpdateFormParams>>,
  Assert<MutuallyAssignable<z.output<typeof FormObject>, Form>>,
  Assert<MutuallyAssignable<z.output<typeof FormList>, List<Form>>>,
  Assert<MutuallyAssignable<z.output<typeof DeletedForm>, SdkDeletedForm>>,
  Assert<MutuallyAssignable<z.output<typeof FormSubmissionObject>, FormSubmission>>,
  Assert<MutuallyAssignable<z.output<typeof FormSubmissionList>, List<FormSubmission>>>,
  Assert<MutuallyAssignable<z.output<typeof DeletedFormSubmission>, SdkDeletedFormSubmission>>,
  Assert<
    MutuallyAssignable<z.output<typeof FormSubmissionWebhookEvent>, SdkFormSubmissionWebhookEvent>
  >,
  Assert<
    MutuallyAssignable<
      z.output<typeof FormSubmissionWebhookEvent>["data"],
      SdkFormSubmissionWebhookEvent["data"]
    >
  >,
  // List queries arrive as strings (the SDK sends numbers and arrays): only their keys must match.
  Assert<Equals<keyof z.input<typeof ListFormsQuery>, keyof ListFormsParams>>,
  Assert<Equals<keyof z.input<typeof ListFormSubmissionsQuery>, keyof ListFormSubmissionsParams>>,
];
