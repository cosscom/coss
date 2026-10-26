import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { Coss } from "coss";
import { createCossMcpServer } from "../src/index.ts";
import { docsPath, markdownPath } from "../src/tools/docs.ts";

const SEARCH_HITS = [
  {
    id: "/docs/sdk/webhooks",
    type: "page",
    content: "Verifying webhooks",
    breadcrumbs: ["Docs", "SDKs and tools", "TypeScript SDK"],
    url: "/docs/sdk/webhooks",
  },
  {
    id: "/docs/sdk/webhooks-0",
    type: "text",
    content: "Verify webhook requests with verifyWebhook.",
    url: "/docs/sdk/webhooks",
  },
  {
    id: "/docs/webhooks-1",
    type: "heading",
    content: "Signatures",
    url: "/docs/webhooks#signatures",
  },
];

/** A fake coss.com serving the docs search and a few `.md` pages. */
function fakeSite(pages: Record<string, string>) {
  const requests: string[] = [];
  const fetch = async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    requests.push(`${url.pathname}${url.search}`);
    if (url.pathname === "/docs/search.json") return Response.json(SEARCH_HITS);
    const page = pages[url.pathname];
    return page === undefined
      ? new Response("Not found", { status: 404 })
      : new Response(page, { headers: { "Content-Type": "text/markdown" } });
  };
  return { fetch: fetch as typeof globalThis.fetch, requests };
}

async function connect(pages: Record<string, string> = {}, apiKey?: string) {
  const site = fakeSite(pages);
  const coss = apiKey
    ? new Coss({ apiKey, baseUrl: "http://api.test", fetch: site.fetch, maxRetries: 0 })
    : undefined;
  const server = createCossMcpServer({
    coss,
    apiKey,
    docs: { baseUrl: "https://coss.test", fetch: site.fetch },
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientTransport);
  const call = async (name: string, args: Record<string, unknown>) => {
    const result = await client.callTool({ name, arguments: args });
    const content = result.content as { type: string; text: string }[];
    return { isError: result.isError === true, text: content[0]?.text ?? "" };
  };
  return { client, call, requests: site.requests };
}

describe("docs tools", () => {
  test("without an API key, only the docs tools, and how to get a key", async () => {
    const { client } = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual(["read_docs", "search_docs"]);
    for (const tool of tools) expect(tool.annotations?.readOnlyHint).toBe(true);
    expect(client.getInstructions()).toContain("npx coss-cli init");
  });

  test("with a key, the docs tools come with every API tool", async () => {
    const { client } = await connect({}, "coss_test_abc");
    const names = (await client.listTools()).tools.map((tool) => tool.name);
    expect(names).toContain("search_docs");
    expect(names).toContain("send_email");
    expect(client.getInstructions()).toContain("read_docs");
  });

  test("search_docs groups hits by page, with each page's Markdown URL", async () => {
    const { call, requests } = await connect();
    const { isError, text } = await call("search_docs", { query: "verify webhook" });
    expect(isError).toBe(false);
    expect(requests).toEqual(["/docs/search.json?query=verify%20webhook"]);
    expect(JSON.parse(text).results).toEqual([
      {
        title: "Verifying webhooks",
        section: "Docs / SDKs and tools / TypeScript SDK",
        url: "https://coss.test/docs/sdk/webhooks",
        markdown_url: "https://coss.test/docs/sdk/webhooks.md",
        matches: ["Verify webhook requests with verifyWebhook."],
      },
      {
        title: "/docs/webhooks",
        url: "https://coss.test/docs/webhooks",
        markdown_url: "https://coss.test/docs/webhooks.md",
        matches: ["## Signatures"],
      },
    ]);
  });

  test("read_docs reads a page's Markdown, from a path or a link", async () => {
    const { call, requests } = await connect({
      "/docs/webhooks.md": "# Webhooks (/docs/webhooks)\n\nSigned requests.",
      "/docs/index.md": "# Introduction (/docs)",
    });
    expect((await call("read_docs", { page: "/docs/webhooks" })).text).toContain(
      "Signed requests.",
    );
    expect(
      (await call("read_docs", { page: "https://coss.test/docs/webhooks#signatures" })).text,
    ).toContain("# Webhooks");
    expect((await call("read_docs", { page: "/docs/webhooks.md" })).isError).toBe(false);
    expect((await call("read_docs", { page: "/docs/" })).text).toBe("# Introduction (/docs)");
    expect(requests).toEqual([
      "/docs/webhooks.md",
      "/docs/webhooks.md",
      "/docs/webhooks.md",
      "/docs/index.md",
    ]);
  });

  test("read_docs pages through a long page", async () => {
    const long = `${"a".repeat(40_000)}b`;
    const { call } = await connect({ "/docs/cli.md": long });
    const first = await call("read_docs", { page: "/docs/cli" });
    expect(first.text).toContain("offset 40000");
    expect(first.text.startsWith("a".repeat(40_000))).toBe(true);
    expect((await call("read_docs", { page: "/docs/cli", offset: 40_000 })).text).toBe("b");
  });

  test("read_docs refuses anything but the docs, and explains a missing page", async () => {
    const { call, requests } = await connect();
    for (const page of ["https://evil.test/docs/x", "/pricing", "/docsx", "../etc/passwd"]) {
      const result = await call("read_docs", { page });
      expect(result.isError).toBe(true);
    }
    expect(requests).toEqual([]);
    const missing = await call("read_docs", { page: "/docs/nope" });
    expect(missing.isError).toBe(true);
    expect(missing.text).toContain("search_docs");
  });
});

test("docs paths", () => {
  expect(markdownPath("/docs")).toBe("/docs/index.md");
  expect(markdownPath("/docs/email/sending#tags")).toBe("/docs/email/sending.md");
  expect(docsPath("/docs/sdk", "https://coss.com")).toBe("/docs/sdk");
  expect(docsPath("https://coss.com/docs/sdk?x=1", "https://coss.com")).toBe("/docs/sdk");
  expect(docsPath("https://other.com/docs/sdk", "https://coss.com")).toBeNull();
});
