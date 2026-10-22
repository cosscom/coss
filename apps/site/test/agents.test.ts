/**
 * What coding agents read: the API reference as Markdown (`<page>.md`, src/lib/operation-markdown.ts),
 * the `.md` rewrites, and the prompt the landing page and /docs/agents hand out.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import spec from "@coss/api/openapi.json";
import snippets from "@coss/sdkgen/snippets.json";
import nextConfig from "../next.config";
import {
  createOperationMarkdown,
  type OpenApiDocument,
  type SdkSnippets,
} from "../src/lib/operation-markdown";
import { AGENT_PROMPT } from "../src/lib/site";

const document = spec as unknown as OpenApiDocument;
const markdown = createOperationMarkdown(document);
const operations = Object.entries(document.paths).flatMap(([path, item]) =>
  Object.entries(item).map(([method, operation]) => ({ method, path, operation })),
);
const CONTENT = path.resolve(import.meta.dir, "../content/docs");

function operation(method: string, path: string) {
  const found = operations.find((op) => op.method === method && op.path === path);
  if (!found) throw new Error(`${method} ${path} is not in openapi.json.`);
  return found;
}

describe("the API reference as Markdown", () => {
  test("every operation renders with its URL, SDK call and responses", () => {
    expect(operations.length).toBeGreaterThan(100);
    for (const op of operations) {
      const text = markdown.full(op, { snippets: snippets as SdkSnippets });
      const label = `${op.method.toUpperCase()} ${op.path}`;
      expect({
        label,
        url: text.includes(`\`${label.replace(" ", " https://api.coss.com")}\``),
      }).toEqual({
        label,
        url: true,
      });
      expect({ label, sdk: /await coss\.[\w.]+\(/.test(text) }).toEqual({ label, sdk: true });
      expect({ label, responses: /## (Response \d{3}|Errors)/.test(text) }).toEqual({
        label,
        responses: true,
      });
      expect(text).not.toContain("undefined");
    }
  });

  test("lists the body's fields with types, requirements and nested objects", () => {
    const text = markdown.full(operation("post", "/v1/emails"), {
      snippets: snippets as SdkSnippets,
    });
    expect(text).toContain("- `from` (string, required): An email address");
    expect(text).toContain("- `to` (string | string[], required, 1-50 items)");
    expect(text).toContain('- `stream` ("transactional" | "marketing")');
    expect(text).toContain("  - `filename` (string, required, 1-255 characters)");
    expect(text).toContain("- `Idempotency-Key` (string, 1-256 characters)");
    expect(text).toContain("## Response 202");
    expect(text).toContain('"object": "email"');
    expect(text).toContain("- `422`: The body failed validation");
    // The other SDKs' samples, after TypeScript and HTTP.
    expect(text).toContain("client.email.send(");
    expect(text).toContain("Python:");
    // Common headers are explained once, on the overview.
    expect(text).not.toContain("- `Coss-Version`");
  });

  test("path and query parameters, with the example's values in the samples", () => {
    const text = markdown.full(operation("get", "/v1/emails/{id}"));
    expect(text).toContain("## Path parameters");
    expect(text).toContain("- `id` (string, required): The email's id.");
    expect(text).toContain('coss.email.get("email_01k7c8m4q2f3e9v6t5r1n0p8yz")');
    expect(text).toContain("https://api.coss.com/v1/emails/email_01k7c8m4q2f3e9v6t5r1n0p8yz");
    expect(markdown.full(operation("get", "/v1/emails"))).toContain("## Query parameters");
  });

  test("the compact entry names the call and links the full page", () => {
    const text = markdown.summary(operation("post", "/v1/emails"), "https://coss.com/x.md");
    expect(text.split("\n")[0]).toBe(
      "`POST /v1/emails` · TypeScript: `coss.email.send()` · parameters, body and responses: https://coss.com/x.md",
    );
  });
});

test("docs pages are served as Markdown at <page>.md", async () => {
  const rewrites = await nextConfig.rewrites?.();
  expect(Array.isArray(rewrites) ? rewrites.slice(0, 2) : rewrites).toEqual([
    { source: "/docs/index.md", destination: "/docs/md" },
    { source: "/docs/:path+.md", destination: "/docs/md/:path+" },
  ]);
});

test("/docs/agents quotes the landing page's prompt exactly", () => {
  const page = readFileSync(path.join(CONTENT, "(tools)/agents.mdx"), "utf8");
  expect(page).toContain(`\`\`\`text\n${AGENT_PROMPT}\n\`\`\``);
});
