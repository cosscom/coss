/**
 * Forms wire types (hand-written mirrors of the API's `Form`, `FormSubmission` and
 * `FormSubmissionWebhookEvent` schemas, kept equal by the contract tests).
 */

export type FormFieldType =
  | "text"
  | "email"
  | "textarea"
  | "number"
  | "tel"
  | "url"
  | "date"
  | "select"
  | "radio"
  | "checkbox"
  | "hidden"
  | "file";

export type FormSubmissionStatus = "pending_confirmation" | "accepted" | "held" | "spam";

export type FormSpamReason = "honeypot" | "risk_block" | "risk_review" | "content";

export type FormCaptchaMode = "off" | "required";

export type FormOnReview = "deliver" | "hold";

/** A field a form defines (validated on every submission, rendered on hosted pages). */
export interface FormFieldInput {
  /** The `name` the input posts: letters, digits and `_ . - [ ]`, not starting with `_`. */
  name: string;
  type: FormFieldType;
  /** Shown on hosted pages and in notifications. Default: the name. */
  label?: string;
  /** Default false. */
  required?: boolean;
  placeholder?: string;
  /** The choices of `select`, `radio` and `checkbox` fields. */
  options?: string[];
  max_length?: number;
}

export interface FormField {
  name: string;
  type: FormFieldType;
  label: string | null;
  required: boolean;
  placeholder: string | null;
  options: string[];
  max_length: number | null;
}

export interface FormSpamSettings {
  /** A field people leave empty (hide it with CSS); filling it marks the submission spam. */
  honeypot_field: string;
  /** `required`: submissions need the environment's captcha (Turnstile or hCaptcha). */
  captcha: FormCaptchaMode;
  /** The captcha's site key, which hosted pages render the widget with. */
  captcha_site_key: string | null;
  /** Text scoring at least this in a content category is spam; `null`: off. */
  content_threshold: number | null;
  /** What Risk's `review` decision does: `hold` the submission, or `deliver` it. */
  on_review: FormOnReview;
}

export interface FormSubmitterSettings {
  /** The field holding the submitter's email address. */
  email_field: string;
  /** Hold every submission until the submitter clicks the link emailed to them. */
  verify: boolean;
  confirmation_from: string | null;
}

export interface FormNotificationSettings {
  /** Members of the organization, or addresses on its verified domains. */
  recipients: string[];
  /** `null`: coss.com's sender ("<form name> via coss.com"). */
  from: string | null;
}

export interface FormContactSettings {
  enabled: boolean;
  audience_ids: string[];
  /** Topic keys the contact is opted into. */
  topics: string[];
  /** `null`: the environment's marketing settings decide. */
  double_opt_in: boolean | null;
  first_name_field: string | null;
  last_name_field: string | null;
  /** Contact property key → the field whose value it takes. */
  properties: Record<string, string>;
}

export interface FormFileSettings {
  enabled: boolean;
  max_files: number;
  max_file_bytes: number;
  /** MIME types (`image/*` allowed); empty: images, PDFs, text and Office. */
  allowed_types: string[];
}

export interface FormHostedSettings {
  enabled: boolean;
  title: string | null;
  description: string | null;
  submit_label: string | null;
  success_message: string | null;
  published_at: string | null;
}

/** A hosted form endpoint: `<form action={form.endpoint} method="post">`. */
export interface Form {
  object: "form";
  id: string;
  name: string;
  enabled: boolean;
  /** Where the form posts. */
  endpoint: string;
  /** The hosted page, when `hosted.enabled`. */
  hosted_url: string | null;
  /** `null`: any field is accepted. */
  fields: FormField[] | null;
  strict_fields: boolean;
  /** Sites that may post to the form; empty: any. */
  allowed_origins: string[];
  redirect_url: string | null;
  spam: FormSpamSettings;
  submitter: FormSubmitterSettings;
  notifications: FormNotificationSettings;
  contacts: FormContactSettings;
  files: FormFileSettings;
  hosted: FormHostedSettings;
  /** coss.com disabled the form for abuse. */
  disabled_by_admin: boolean;
  sandbox: boolean;
  created_at: string;
  updated_at: string;
}

interface FormSettingsParams {
  /** `false`: submissions are refused. */
  enabled?: boolean;
  /** `null`: any field is accepted. */
  fields?: FormFieldInput[] | null;
  strict_fields?: boolean;
  allowed_origins?: string[];
  redirect_url?: string | null;
  spam?: {
    honeypot_field?: string;
    captcha?: FormCaptchaMode;
    captcha_site_key?: string | null;
    /** 0.5-1, or `null` (off). */
    content_threshold?: number | null;
    on_review?: FormOnReview;
  };
  submitter?: {
    email_field?: string;
    verify?: boolean;
    confirmation_from?: string | null;
  };
  notifications?: { recipients?: string[]; from?: string | null };
  contacts?: {
    enabled?: boolean;
    audience_ids?: string[];
    topics?: string[];
    double_opt_in?: boolean | null;
    first_name_field?: string | null;
    last_name_field?: string | null;
    properties?: Record<string, string>;
  };
  files?: {
    enabled?: boolean;
    max_files?: number;
    max_file_bytes?: number;
    allowed_types?: string[];
  };
  hosted?: {
    enabled?: boolean;
    title?: string | null;
    description?: string | null;
    submit_label?: string | null;
    success_message?: string | null;
  };
}

/** Body of `coss.forms.create()` (`POST /v1/forms`). */
export interface CreateFormParams extends FormSettingsParams {
  name: string;
}

/** Body of `coss.forms.update()` (`PATCH /v1/forms/{id}`): only what is given changes. */
export interface UpdateFormParams extends FormSettingsParams {
  name?: string;
}

export interface ListFormsParams {
  /** 1-100, default 20. */
  limit?: number;
  /** The `id` of the last form of the previous page. */
  after?: string;
}

export interface DeletedForm {
  object: "form";
  id: string;
  deleted: true;
}

export interface FormSubmissionFile {
  id: string;
  field: string;
  filename: string;
  content_type: string;
  /** Bytes. */
  size: number;
}

/** What someone submitted to a form. */
export interface FormSubmission {
  object: "form_submission";
  id: string;
  form_id: string;
  status: FormSubmissionStatus;
  /** Field name → value; a field posted several times has an array. */
  data: Record<string, string | string[]>;
  submitter_email: string | null;
  files: FormSubmissionFile[];
  spam_reason: FormSpamReason | null;
  /** Risk's assessment; `null` when none ran (honeypot). */
  risk: {
    assessment_id: string | null;
    decision: "allow" | "review" | "block" | null;
    score: number | null;
  } | null;
  ip: string | null;
  user_agent: string | null;
  origin: string | null;
  referrer: string | null;
  confirmed_at: string | null;
  accepted_at: string | null;
  released_at: string | null;
  sandbox: boolean;
  created_at: string;
}

export interface ListFormSubmissionsParams {
  /** Only these statuses. */
  status?: FormSubmissionStatus[];
  /** 1-100, default 20. */
  limit?: number;
  /** The `id` of the last submission of the previous page. */
  after?: string;
}

export interface DeletedFormSubmission {
  object: "form_submission";
  id: string;
  deleted: true;
}

export type FormWebhookEventType = "form.submission.received" | "form.submission.flagged";

export interface FormSubmissionWebhookEventData {
  form_id: string;
  form_name: string;
  submission_id: string;
  status: FormSubmissionStatus;
  data: Record<string, string | string[]>;
  submitter_email: string | null;
  /** Download them with `coss.forms.submissions.file()`; never their bytes here. */
  files: FormSubmissionFile[];
  spam_reason: FormSpamReason | null;
  sandbox: boolean;
  occurred_at: string;
}

/** `form.submission.received` (accepted) or `form.submission.flagged` (held or spam). */
export interface FormSubmissionWebhookEvent {
  id: string;
  object: "event";
  type: FormWebhookEventType;
  api_version: string;
  created_at: string;
  data: FormSubmissionWebhookEventData;
}
