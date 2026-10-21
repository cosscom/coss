"use client";
import { createCodeUsageGeneratorRegistry } from "fumadocs-openapi/requests/generators";
import { curl } from "fumadocs-openapi/requests/generators/curl";
import { createOpenAPIPage } from "fumadocs-openapi/ui";
import { renderSdkSample } from "@/lib/sdk-samples";

// Tabs show in insertion order: the TypeScript SDK, raw HTTP, then the generated SDKs (each
// operation's `x-codeSamples`, added by `src/lib/openapi.ts`).
const codeUsages = createCodeUsageGeneratorRegistry();
codeUsages.add("sdk", { label: "TypeScript", lang: "ts", generate: renderSdkSample });
codeUsages.add("curl", curl);

// The playground calls the API straight from the browser with the key the reader pastes in; the
// API allows this site's origin (`API_CORS_ORIGINS`).
export const OpenAPIPage = createOpenAPIPage({ codeUsages });
