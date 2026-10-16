/**
 * The one-shot local server the dashboard redirects to after approval (RFC 8252 loopback redirect):
 * listens on 127.0.0.1 only, on a port the OS picks, and accepts one `/callback` with our `state`.
 */
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export type CallbackResult = { code: string } | { error: string };

const PAGE = (title: string, text: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>` +
  '<meta name="viewport" content="width=device-width, initial-scale=1">' +
  "<style>body{font:16px system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;color:#111}" +
  "main{max-width:28rem;padding:1.5rem}h1{font-size:1.25rem}p{color:#555}</style></head>" +
  `<body><main><h1>${title}</h1><p>${text}</p></main></body></html>`;

export type Loopback = {
  port: number;
  /** Resolves with the code (or the dashboard's error) for `state`; rejects on timeout or abort. */
  wait(state: string, options: { timeoutMs: number; signal: AbortSignal }): Promise<CallbackResult>;
  close(): Promise<void>;
};

export async function startLoopback(): Promise<Loopback> {
  let deliver: ((params: URLSearchParams) => boolean) | null = null;
  const server: Server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method !== "GET" || url.pathname !== "/callback") {
      response.writeHead(404, { "content-type": "text/plain" }).end("Not found");
      return;
    }
    const accepted = deliver?.(url.searchParams) ?? false;
    const denied = url.searchParams.get("error") !== null;
    response
      .writeHead(accepted ? 200 : 400, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
      })
      .end(
        !accepted
          ? PAGE(
              "This sign-in doesn't match",
              "Run <code>coss login</code> again in your terminal.",
            )
          : denied
            ? PAGE("Sign-in canceled", "Nothing was changed. You can close this tab.")
            : PAGE(
                "Signed in to the coss.com CLI",
                "Return to your terminal. You can close this tab.",
              ),
      );
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const { port } = server.address() as AddressInfo;

  return {
    port,
    wait(state, { timeoutMs, signal }) {
      return new Promise<CallbackResult>((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timer);
          signal.removeEventListener("abort", onAbort);
          deliver = null;
        };
        const onAbort = () => {
          cleanup();
          reject(new Error("Interrupted."));
        };
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error("Timed out waiting for the browser."));
        }, timeoutMs);
        signal.addEventListener("abort", onAbort, { once: true });
        if (signal.aborted) return onAbort();
        deliver = (params) => {
          // Anything else that reaches the port (another tab, a scanner) is turned away.
          if (params.get("state") !== state) return false;
          const error = params.get("error");
          const code = params.get("code");
          if (!error && !code) return false;
          cleanup();
          resolve(error ? { error } : { code: code as string });
          return true;
        };
      });
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
