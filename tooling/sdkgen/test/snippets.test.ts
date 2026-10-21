import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import snippets from "../snippets.json" with { type: "json" };
import { LANGUAGES } from "../src/languages.ts";
import {
  buildSnippets,
  indexTypes,
  normalizeChain,
  parseReference,
  SNIPPET_LANGUAGES,
  type SnippetLanguage,
  type TypeIndex,
} from "../src/snippets.ts";

const sdks = join(import.meta.dir, "../../../sdks");

describe("snippets", () => {
  test("compare method chains across languages", () => {
    expect(normalizeChain("email.dedicatedIps.get")).toBe("email.dedicatedips.get");
    expect(normalizeChain("client.Email.DedicatedIPs.GetAsync")).toBe("email.dedicatedips.get");
    expect(normalizeChain("$client->email->dedicatedIps->get")).toBe("email.dedicatedips.get");
    expect(normalizeChain("client.email.dedicated_ips.get")).toBe("email.dedicatedips.get");
    expect(normalizeChain("client.email.send_")).toBe("email.send");
  });

  test("read each endpoint's usage from a reference.md", () => {
    const usages = parseReference(
      [
        '<details><summary><code>client.Email.<a href="x">SendAsync</a>(SendEmailBody { ... }) -> WithRawResponseTask&lt;EmailMessage&gt;</code></summary>',
        "#### 🔌 Usage",
        "```csharp",
        "await client.Email.SendAsync(new SendEmailBody());",
        "```",
        "</details>",
      ].join("\n"),
    );
    expect(usages.get("email.send")).toBe("await client.Email.SendAsync(new SendEmailBody());");
  });

  test("leave out operations no SDK has yet, and fail on one only some have", () => {
    const empty = Object.fromEntries(SNIPPET_LANGUAGES.map((language) => [language, ""])) as Record<
      SnippetLanguage,
      string
    >;
    const indexes = Object.fromEntries(
      SNIPPET_LANGUAGES.map((language) => [language, new Map()]),
    ) as Record<SnippetLanguage, TypeIndex>;
    expect(buildSnippets(empty, indexes)).toEqual({});
    const python = [
      "<details><summary><code>client.environment.get() -> Environment</code></summary>",
      "#### 🔌 Usage",
      "```python",
      "client.environment.get()",
      "```",
    ].join("\n");
    expect(() => buildSnippets({ ...empty, python }, indexes)).toThrow("go: GET /v1/environment");
  });

  // `bun run --cwd tooling/sdkgen snippets` (or `sdks:generate`) rewrites it.
  test("snippets.json matches the generated SDKs", async () => {
    const references = {} as Record<SnippetLanguage, string>;
    const indexes = {} as Record<SnippetLanguage, TypeIndex>;
    for (const language of SNIPPET_LANGUAGES) {
      const dir = join(
        sdks,
        LANGUAGES.find((candidate) => candidate.group === language)?.dir ?? language,
      );
      references[language] = await Bun.file(join(dir, "reference.md")).text();
      indexes[language] = await indexTypes(language, dir);
    }
    expect(buildSnippets(references, indexes)).toEqual(snippets);
  });
});
