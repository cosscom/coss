import "server-only";
import spec from "@coss/api/openapi.json";
import type { Document } from "fumadocs-openapi";
import { createOpenAPI } from "fumadocs-openapi/server";
import { DEV_API_ORIGIN } from "./site";

/**
 * The public API's OpenAPI document. It is the committed snapshot apps/api/openapi.json (regenerate
 * with `bun run openapi:generate`), bundled at build time: the site never imports the API itself.
 */
export const openapi = createOpenAPI({
  input: { coss: withLocalServer(spec as Document) },
});

/** In `next dev`, samples and the playground target the local API (`bun run dev`) first. */
function withLocalServer(document: Document): Document {
  if (process.env.NODE_ENV !== "development") return document;
  const local = { url: DEV_API_ORIGIN, description: "Local API" };
  return { ...document, servers: [local, ...(document.servers ?? [])] };
}
