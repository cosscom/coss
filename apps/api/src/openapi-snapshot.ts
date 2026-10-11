import { createEmailService, FakeEmailProvider } from "@coss/email";
import { createApp, openApiDocumentConfig } from "./app.ts";

/** The production origin, also the SDK's default `baseUrl`. */
export const PUBLIC_API_URL = "https://api.coss.com";

/** Committed copy of the OpenAPI document, read by the docs site (`apps/site`). */
export const OPENAPI_SNAPSHOT_PATH = new URL("../openapi.json", import.meta.url);

/**
 * The OpenAPI document as served in production, serialized for `openapi.json`. Building it never
 * touches the database: routes are only registered, not run.
 */
export function renderOpenApiSnapshot(): string {
  // A placeholder key: no route runs, so nothing is ever encrypted with it.
  const app = createApp({
    emailService: createEmailService({
      liveProvider: new FakeEmailProvider({ log: false }),
      sandboxProvider: new FakeEmailProvider({ log: false }),
      queue: {
        async enqueue() {
          throw new Error("OpenAPI generation cannot enqueue emails");
        },
      },
    }),
    webhookDeps: { secretsKey: Buffer.alloc(32), allowInsecureUrls: false },
  });
  const document = app.getOpenAPI31Document(openApiDocumentConfig(PUBLIC_API_URL));
  return `${JSON.stringify(document, null, 2)}\n`;
}
