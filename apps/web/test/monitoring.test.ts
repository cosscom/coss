import { afterEach, expect, spyOn, test } from "bun:test";
import { MAX_ENVELOPE_BYTES } from "@coss/observability/tunnel";
import { POST } from "../src/app/api/monitoring/route";

const DSN = "https://abc123@o42.ingest.us.sentry.io/4507";
const originalDsn = process.env.SENTRY_DSN;
afterEach(() => {
  if (originalDsn === undefined) delete process.env.SENTRY_DSN;
  else process.env.SENTRY_DSN = originalDsn;
});

test("tunnel cancels oversized chunked uploads before reading the remaining body", async () => {
  process.env.SENTRY_DSN = DSN;
  for (const contentLength of [undefined, "1"]) {
    let reads = 0;
    let canceled = false;
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          reads++;
          controller.enqueue(new Uint8Array(reads === 1 ? MAX_ENVELOPE_BYTES : 1));
        },
        cancel() {
          canceled = true;
        },
      },
      { highWaterMark: 0 },
    );
    const fetchSpy = spyOn(globalThis, "fetch");
    try {
      const response = await POST(
        new Request("https://coss.com/api/monitoring", {
          method: "POST",
          headers: contentLength ? { "Content-Length": contentLength } : {},
          body,
        }),
      );
      expect(response.status).toBe(413);
      expect(reads).toBe(2);
      expect(canceled).toBe(true);
      expect(body.locked).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  }
});

test("tunnel forwards an envelope exactly at the limit byte for byte", async () => {
  process.env.SENTRY_DSN = DSN;
  const bytes = new Uint8Array(MAX_ENVELOPE_BYTES).fill(32);
  bytes.set(new TextEncoder().encode(`${JSON.stringify({ dsn: DSN })}\n`));
  const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(null, { status: 429, headers: { "Retry-After": "60" } }),
  );
  try {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.subarray(0, 73));
        controller.enqueue(bytes.subarray(73));
        controller.close();
      },
    });
    const response = await POST(
      new Request("https://coss.com/api/monitoring", { method: "POST", body }),
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe("https://o42.ingest.us.sentry.io/api/4507/envelope/");
    expect(fetchSpy.mock.calls[0]?.[1]?.body).toEqual(bytes);
  } finally {
    fetchSpy.mockRestore();
  }
});

test("tunnel rate-limits invalid public envelopes before forwarding", async () => {
  process.env.SENTRY_DSN = DSN;
  const fetchSpy = spyOn(globalThis, "fetch");
  try {
    let denied: Response | null = null;
    for (let i = 0; i < 70; i++) {
      const response = await POST(
        new Request("https://coss.com/api/monitoring", { method: "POST", body: "invalid" }),
      );
      if (response.status === 429) {
        denied = response;
        break;
      }
      expect(response.status).toBe(400);
    }
    expect(denied?.status).toBe(429);
    expect(denied?.headers.get("retry-after")).not.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally {
    fetchSpy.mockRestore();
  }
});

// Loading the real Next/Sentry SDK in a subprocess can exceed 5s on a busy CI runner.
test("real console integrations send no secret URLs or raw arguments in envelopes", async () => {
  // Isolate SDK globals and console instrumentation from the rest of the test runner.
  const child = Bun.spawn(
    [
      process.execPath,
      "-e",
      `
    import * as Sentry from "@sentry/nextjs";
    import { sentryOptions } from "@coss/observability";
    const envelopes = [];
    Sentry.init({
      ...sentryOptions({ dsn: ${JSON.stringify(DSN)}, environment: "test", tracesSampleRate: 0 }, "web"),
      defaultIntegrations: false,
      integrations: [Sentry.consoleIntegration(), Sentry.captureConsoleIntegration({ levels: ["error"] })],
      transport: () => ({
        send(envelope) { envelopes.push(envelope); return Promise.resolve({ statusCode: 200 }); },
        flush() { return Promise.resolve(true); },
      }),
    });
    console.log("visited /t/o/tok_SECRET", { nested: { url: "/reset-password/reset_SECRET" } });
    console.error("failed /t/c/click_SECRET/1", { nested: ["/reset-password/reset_SECRET"] });
    console.error(new Error("failed /reset-password/error_SECRET"));
    await Sentry.close(2000);
    process.stdout.write("ENVELOPES=" + JSON.stringify(envelopes));
  `,
    ],
    { cwd: `${import.meta.dir}/..`, stdout: "pipe", stderr: "pipe" },
  );
  const output = await new Response(child.stdout).text();
  const stderr = await new Response(child.stderr).text();
  expect(await child.exited, stderr).toBe(0);
  const serialized = output.slice(output.indexOf("ENVELOPES=") + "ENVELOPES=".length);
  const envelopes = JSON.parse(serialized);
  expect(envelopes).toHaveLength(2);
  expect(serialized).not.toContain("_SECRET");
  expect(serialized).not.toContain('"arguments"');
  expect(serialized).toContain("visited /t/o/[token]");
  expect(serialized).toContain("failed /t/c/[token]/1");
  expect(serialized).toContain("failed /reset-password/[token]");
}, 15_000);
