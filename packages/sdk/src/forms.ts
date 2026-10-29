/**
 * `coss/forms`: posts a form to its coss.com Forms endpoint from the browser, without a page load.
 * `attachForm(form)` takes over a `<form action="https://…/f/<id>">`'s submit; `submitForm()` posts
 * one yourself. Either adds a `coss/device` token (`_coss_device`, so Risk recognizes the browser)
 * and sends the form's fields and files as they are (captcha widgets' tokens included).
 *
 * Plain HTML forms work without this: it only makes the answer JSON (errors per field, no
 * redirect). Never throws: network failures come back as `{ ok: false, error }`.
 */
import { collectDevice } from "./device.ts";

/** Why a field (or, with `field: null`, the whole submission) was refused. */
export interface FormFieldError {
  field: string | null;
  code:
    | "required"
    | "invalid"
    | "too_long"
    | "unknown_field"
    | "too_many_fields"
    | "too_large"
    | "file_type"
    | "too_many_files"
    | "files_not_accepted"
    | "captcha";
  message: string;
}

export type FormSubmitResult =
  /** Received, or waiting for the submitter's email link (`pending_confirmation`). */
  | { ok: true; status: "received" | "pending_confirmation" }
  /** Fix these and submit again (422). */
  | { ok: false; errors: FormFieldError[]; error?: undefined }
  /** The form refused it (unavailable, another site, too many submissions) or the network failed. */
  | { ok: false; errors?: undefined; error: string };

export interface SubmitFormOptions {
  /** The form's `endpoint`. Default: the form element's `action`. */
  endpoint?: string;
  /** Add a `coss/device` token (default true). */
  device?: boolean;
  signal?: AbortSignal;
  /** Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

type FormSource = HTMLFormElement | FormData | Record<string, string | string[] | Blob>;

function toFormData(source: FormSource): FormData {
  // A copy: the device token added below must never stay in the caller's FormData (a reused one
  // would carry an old token, which Risk refuses once it is a day old).
  if (typeof FormData !== "undefined" && source instanceof FormData) {
    const copy = new FormData();
    for (const [name, value] of source.entries()) copy.append(name, value);
    return copy;
  }
  if (typeof HTMLFormElement !== "undefined" && source instanceof HTMLFormElement) {
    return new FormData(source);
  }
  const data = new FormData();
  for (const [name, value] of Object.entries(source as Record<string, unknown>)) {
    for (const one of Array.isArray(value) ? value : [value]) {
      if (typeof Blob !== "undefined" && one instanceof Blob) data.append(name, one);
      else data.append(name, String(one));
    }
  }
  return data;
}

/**
 * A form's own members are shadowed by controls of the same name (`<input name="action">`,
 * `name="reset"`, even `name="getAttribute"`), so they are always read through the prototypes.
 */
const formDom = {
  attribute: (form: HTMLFormElement, name: string): string | null =>
    Element.prototype.getAttribute.call(form, name),
  baseURI: (form: HTMLFormElement): string =>
    (Object.getOwnPropertyDescriptor(Node.prototype, "baseURI")?.get?.call(form) as
      | string
      | undefined) ?? globalThis.location.href,
  submitButtons: (form: HTMLFormElement): HTMLButtonElement[] => [
    ...(Element.prototype.querySelectorAll.call(
      form,
      "button[type=submit], button:not([type])",
    ) as NodeListOf<HTMLButtonElement>),
  ],
};

/** The form's `action` attribute, resolved like the browser does (never `form.action`). */
function actionOf(form: HTMLFormElement): string | null {
  const action = formDom.attribute(form, "action");
  if (!action) return null;
  try {
    return new URL(action, formDom.baseURI(form)).href;
  } catch {
    return null;
  }
}

function endpointOf(source: FormSource, options: SubmitFormOptions): string | null {
  if (options.endpoint) return options.endpoint;
  if (typeof HTMLFormElement !== "undefined" && source instanceof HTMLFormElement) {
    return actionOf(source);
  }
  return null;
}

/** Posts the fields (and files) to the form's endpoint and returns what it said. */
export async function submitForm(
  source: FormSource,
  options: SubmitFormOptions = {},
): Promise<FormSubmitResult> {
  const endpoint = endpointOf(source, options);
  if (!endpoint)
    return { ok: false, error: "No endpoint: pass `endpoint` or set the form's action." };
  const body = toFormData(source);
  if (options.device !== false && !body.has("_coss_device")) {
    body.set("_coss_device", collectDevice());
  }
  const doFetch = options.fetch ?? globalThis.fetch;
  try {
    const response = await doFetch(endpoint, {
      method: "POST",
      headers: { Accept: "application/json" },
      body,
      credentials: "omit",
      signal: options.signal,
    });
    const answer = (await response.json().catch(() => null)) as {
      ok?: boolean;
      status?: string;
      errors?: FormFieldError[];
      error?: string;
    } | null;
    if (answer?.ok === true) {
      return {
        ok: true,
        status: answer.status === "pending_confirmation" ? "pending_confirmation" : "received",
      };
    }
    if (Array.isArray(answer?.errors)) return { ok: false, errors: answer.errors };
    return {
      ok: false,
      error: answer?.error ?? `The form answered ${response.status}.`,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The form couldn't be reached.",
    };
  }
}

export interface AttachFormOptions extends SubmitFormOptions {
  /** Called with each answer (default: nothing; the form is reset after a success). */
  onResult?: (result: FormSubmitResult, form: HTMLFormElement) => void;
  /** Reset the form after a success (default true). */
  reset?: boolean;
}

/**
 * Submits `form` through `submitForm()` instead of navigating. Returns a function that detaches it.
 * The submit button is disabled while a submission is on its way.
 */
export function attachForm(form: HTMLFormElement, options: AttachFormOptions = {}): () => void {
  let busy = false;
  const listener = async (event: Event) => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    // Read before the buttons are disabled: a native submission includes the clicked named
    // button (`<button name="plan" value="pro">`), and so does this one.
    const data = new FormData(form);
    const submitter = (event as SubmitEvent).submitter as
      | HTMLButtonElement
      | HTMLInputElement
      | null
      | undefined;
    if (submitter?.name) data.append(submitter.name, submitter.value);
    const buttons = formDom.submitButtons(form);
    // Restored as they were: a button the page disabled on purpose stays disabled.
    const wasDisabled = buttons.map((button) => button.disabled);
    for (const button of buttons) button.disabled = true;
    try {
      const result = await submitForm(data, {
        ...options,
        endpoint: options.endpoint ?? actionOf(form) ?? undefined,
      });
      if (result.ok && options.reset !== false) HTMLFormElement.prototype.reset.call(form);
      options.onResult?.(result, form);
    } finally {
      for (const [index, button] of buttons.entries())
        button.disabled = wasDisabled[index] ?? false;
      busy = false;
    }
  };
  EventTarget.prototype.addEventListener.call(form, "submit", listener);
  return () => EventTarget.prototype.removeEventListener.call(form, "submit", listener);
}
