/**
 * React Email: a send's `react` is rendered into `html` (and `text`, unless given) by
 * `@react-email/render`, an optional peer dependency imported only when a send has `react`, so the
 * SDK itself keeps zero dependencies.
 */
import { type CossError, clientError } from "./core/errors.ts";
import type { SendEmailParams } from "./types/email.ts";

/** What the SDK needs from `@react-email/render` (its 1.x and 2.x releases both fit). */
export interface ReactEmailRenderer {
  render: (node: never, options?: { plainText?: boolean }) => Promise<string>;
  /** 2.x only: converts rendered HTML to text without rendering again. */
  toPlainText?: (html: string) => string;
}

/** A send's body as the API takes it. */
export type SendEmailBody = Omit<SendEmailParams, "react">;

let renderer: Promise<ReactEmailRenderer | null> | undefined;

/** Imports `@react-email/render` once; `null` when it isn't installed. */
export function loadReactEmailRenderer(): Promise<ReactEmailRenderer | null> {
  // A literal specifier inside try/catch: bundlers include the package when it is installed (Workers
  // have no node_modules at runtime) and only warn when it isn't.
  renderer ??= (async () => {
    try {
      return (await import("@react-email/render")) as unknown as ReactEmailRenderer;
    } catch {
      return null;
    }
  })();
  return renderer;
}

/**
 * Turns `react` into `html` and `text`; params without it pass through. Rendering mistakes come back
 * as `invalid_request_error`s naming `param`, like the API's validation errors, never thrown.
 */
export async function renderReactEmail(
  params: SendEmailParams,
  param: string,
  load: () => Promise<ReactEmailRenderer | null> = loadReactEmailRenderer,
): Promise<{ body: SendEmailBody; error: null } | { body: null; error: CossError }> {
  const { react, ...body } = params;
  if (react === undefined) return { body, error: null };
  if (body.html !== undefined) {
    return failure("validation_error", "Pass either `react` or `html`, not both.", param);
  }
  const renderer = await load();
  if (!renderer) {
    return failure(
      "react_renderer_missing",
      "Sending `react` needs the `@react-email/render` package: install it next to `coss`.",
      param,
    );
  }
  try {
    const html = await renderer.render(react as never);
    if (body.text !== undefined) return { body: { ...body, html }, error: null };
    const text = renderer.toPlainText
      ? renderer.toPlainText(html)
      : await renderer.render(react as never, { plainText: true });
    return { body: { ...body, html, text }, error: null };
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    return failure("react_render_failed", `Rendering \`react\` failed: ${reason}`, param);
  }
}

function failure(code: string, message: string, param: string): { body: null; error: CossError } {
  return { body: null, error: { ...clientError("invalid_request_error", code, message), param } };
}
