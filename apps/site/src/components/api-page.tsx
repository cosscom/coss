"use client";
import { createCodeUsageGeneratorRegistry } from "fumadocs-openapi/requests/generators";
import { curl } from "fumadocs-openapi/requests/generators/curl";
import { go } from "fumadocs-openapi/requests/generators/go";
import { python } from "fumadocs-openapi/requests/generators/python";
import { createOpenAPIPage } from "fumadocs-openapi/ui";
import { renderSdkSample } from "@/lib/sdk-samples";

// Tabs show in insertion order: the SDK first, then raw HTTP.
const codeUsages = createCodeUsageGeneratorRegistry();
codeUsages.add("sdk", { label: "TypeScript", lang: "ts", generate: renderSdkSample });
codeUsages.add("curl", curl);
codeUsages.add("python", python);
codeUsages.add("go", go);

// The playground calls the API straight from the browser with the key the reader pastes in; the
// API allows this site's origin (`API_CORS_ORIGINS`).
export const OpenAPIPage = createOpenAPIPage({ codeUsages });
