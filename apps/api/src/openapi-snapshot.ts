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
  const document = createApp().getOpenAPI31Document(openApiDocumentConfig(PUBLIC_API_URL));
  return `${JSON.stringify(document, null, 2)}\n`;
}
