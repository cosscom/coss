/** Serves the API with Bun and drains it on shutdown (ECS stops tasks with SIGTERM). */

/**
 * Seconds an idle keep-alive connection stays open. Longer than the ALB's idle timeout (60 s by
 * default): if the server closed first, the ALB could reuse a closing connection and answer 502.
 */
export const IDLE_TIMEOUT_SECONDS = 75;

export type Fetch = (request: Request) => Response | Promise<Response>;

export type RunningServer = {
  readonly url: URL;
  /**
   * Stops accepting connections, lets in-flight requests finish (idle keep-alive connections close
   * at once), then runs `onDrained` (closing the database pool). Idempotent.
   */
  shutdown(): Promise<void>;
};

export function startServer(options: {
  fetch: Fetch;
  port: number;
  hostname?: string;
  onDrained?: () => Promise<void>;
}): RunningServer {
  const server = Bun.serve({
    port: options.port,
    hostname: options.hostname,
    idleTimeout: IDLE_TIMEOUT_SECONDS,
    fetch: (request) => options.fetch(request),
  });
  let shuttingDown: Promise<void> | undefined;
  return {
    url: server.url,
    shutdown() {
      shuttingDown ??= (async () => {
        await server.stop();
        await options.onDrained?.();
      })();
      return shuttingDown;
    },
  };
}
