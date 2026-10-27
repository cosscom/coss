/**
 * Messages to the page embedding the signing page (`mountSigning` from `coss/sign`, which checks
 * they come from this origin and this iframe). They carry ids and statuses only. Sent to any
 * origin: only origins in the environment's `allowed_origins` can frame this page at all
 * (`frame-ancestors`), and a page opened on its own has no parent to tell.
 */
export const SIGN_MESSAGE_VERSION = 1;

export type EmbedMessage =
  | { type: "ready"; request_id: string; signer_id: string }
  | { type: "viewed"; request_id: string; signer_id: string }
  | { type: "signed"; request_id: string; signer_id: string; request_status: "sent" | "completed" }
  | { type: "declined"; request_id: string; signer_id: string; reason: string | null }
  | { type: "error"; code: string; message: string }
  | { type: "resize"; height: number };

export function postToHost(message: EmbedMessage): void {
  if (typeof window === "undefined" || window.parent === window) return;
  window.parent.postMessage(
    { source: "coss-sign", version: SIGN_MESSAGE_VERSION, ...message },
    "*",
  );
}

/** Tells the host the page's height whenever it changes, so the iframe can fit it. */
export function reportHeight(): () => void {
  if (typeof window === "undefined" || window.parent === window) return () => {};
  let last = 0;
  const observer = new ResizeObserver(() => {
    const height = document.documentElement.scrollHeight;
    if (Math.abs(height - last) < 2) return;
    last = height;
    postToHost({ type: "resize", height });
  });
  observer.observe(document.body);
  return () => observer.disconnect();
}
