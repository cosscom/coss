/**
 * `coss/sign`: embeds coss.com's signing page in your app. Create a signing session on your server
 * (`coss.sign.sessions.create(requestId, signerId)`), pass its `url` to the browser, and mount it:
 *
 * ```ts
 * import { mountSigning } from "coss/sign";
 *
 * const signing = mountSigning({
 *   url: session.url,
 *   container: document.getElementById("sign")!,
 *   onEvent: (event) => {
 *     if (event.type === "signed") showThanks();
 *   },
 * });
 * ```
 *
 * The page's origin must be in your Sign settings' `allowed_origins`. The iframe grows with its
 * content, up to the window's height, unless you give it a `height`. Events are only accepted from the iframe itself, from the
 * signing app's origin. Browser-only; never throws for what the page reports (it calls `onEvent`).
 */

/** The protocol version of the messages below. */
export const SIGN_MESSAGE_VERSION = 1;

/** What the signing page tells your app, in order: `ready`, `viewed`, then `signed` or `declined`. */
export type SigningEvent =
  /** The page loaded the request. */
  | { type: "ready"; request_id: string; signer_id: string }
  /** The signer opened the documents (after agreeing to sign electronically). */
  | { type: "viewed"; request_id: string; signer_id: string }
  /** The signer signed; `request_status` is `completed` when they were the last one. */
  | {
      type: "signed";
      request_id: string;
      signer_id: string;
      request_status: "sent" | "completed";
    }
  /** The signer declined (which declines the whole request). */
  | { type: "declined"; request_id: string; signer_id: string; reason: string | null }
  /** The link is invalid or expired, or the request can't be signed (`code` says why). */
  | { type: "error"; code: string; message: string };

export interface MountSigningOptions {
  /** A signing session's `url`. */
  url: string;
  /** Where the iframe goes: it fills the container's width. */
  container: HTMLElement;
  /** Called for each event of the signing page. */
  onEvent?: (event: SigningEvent) => void;
  /**
   * A fixed CSS height (e.g. `"80vh"`); default: the page's own height as it changes, up to the
   * window's (longer documents scroll inside the frame, so its dialogs stay on screen).
   */
  height?: string;
  /** The iframe's accessible title. Default "Sign documents". */
  title?: string;
}

export interface SigningEmbed {
  readonly iframe: HTMLIFrameElement;
  /** Removes the iframe and stops listening. */
  destroy(): void;
}

type Message = { source: "coss-sign"; version: number; type: string; [key: string]: unknown };

function isMessage(data: unknown): data is Message {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { source?: unknown }).source === "coss-sign" &&
    typeof (data as { type?: unknown }).type === "string"
  );
}

/** Mounts the signing page of a session in `container`. */
export function mountSigning(options: MountSigningOptions): SigningEmbed {
  const origin = new URL(options.url).origin;
  const iframe = options.container.ownerDocument.createElement("iframe");
  iframe.src = options.url;
  iframe.title = options.title ?? "Sign documents";
  // The URL's fragment holds the session token: never send the page's address anywhere.
  iframe.referrerPolicy = "no-referrer";
  iframe.style.width = "100%";
  iframe.style.border = "0";
  iframe.style.display = "block";
  iframe.style.height = options.height ?? "640px";
  // The page centers its dialogs in the frame: a frame taller than the window could put them off
  // screen.
  if (!options.height) iframe.style.maxHeight = "100vh";
  options.container.appendChild(iframe);

  const view = options.container.ownerDocument.defaultView;
  const listener = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow || event.origin !== origin) return;
    if (!isMessage(event.data)) return;
    const { source: _source, version: _version, ...rest } = event.data;
    if (rest.type === "resize") {
      if (!options.height && typeof rest.height === "number" && rest.height > 0) {
        iframe.style.height = `${Math.ceil(rest.height)}px`;
      }
      return;
    }
    options.onEvent?.(rest as SigningEvent);
  };
  view?.addEventListener("message", listener);
  return {
    iframe,
    destroy() {
      view?.removeEventListener("message", listener);
      iframe.remove();
    },
  };
}
