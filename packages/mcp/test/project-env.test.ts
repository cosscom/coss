import { describe, expect, test } from "bun:test";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readProjectApiKey, saveWebhookSecret } from "../src/project-env.ts";

async function tree(files: Record<string, string>): Promise<string> {
  const root = join(tmpdir(), `coss-mcp-env-${crypto.randomUUID()}`);
  for (const [name, text] of Object.entries(files)) {
    const path = join(root, name);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, text);
  }
  return root;
}

describe("readProjectApiKey", () => {
  test("reads a development key from .env.local before .env", async () => {
    const root = await tree({
      ".env.local": "COSS_API_KEY=coss_test_local\nCOSS_BASE_URL=http://localhost:3001\n",
      ".env": "COSS_API_KEY=coss_test_dotenv\n",
    });
    const found = await readProjectApiKey(root);
    expect(found).toEqual({
      kind: "test",
      apiKey: "coss_test_local",
      baseUrl: "http://localhost:3001",
      file: join(root, ".env.local"),
    });
  });

  test("a non-development key stops the walk", async () => {
    const root = await tree({
      "app/.env": "COSS_API_KEY=coss_live_secret\n",
      ".env.local": "COSS_API_KEY=coss_test_parent\n",
    });
    const found = await readProjectApiKey(join(root, "app"));
    expect(found).toEqual({ kind: "live", file: join(root, "app/.env") });
  });

  test("walks up to a development key", async () => {
    const root = await tree({ ".env": 'export COSS_API_KEY="coss_test_up"\n' });
    const found = await readProjectApiKey(join(root, "apps", "web"));
    expect(found).toMatchObject({ kind: "test", apiKey: "coss_test_up" });
  });

  test("none when no file has a key", async () => {
    const root = await tree({ ".env": "DATABASE_URL=postgres://x\n" });
    expect(await readProjectApiKey(root)).toEqual({ kind: "none" });
  });
});

describe("saveWebhookSecret", () => {
  test("appends to the file that already holds the key, replacing a different secret", async () => {
    const root = await tree({
      ".env": "COSS_API_KEY=coss_test_x\nCOSS_WEBHOOK_SECRET=whsec_old\n",
      "app/.gitkeep": "",
    });
    const saved = await saveWebhookSecret(join(root, "app"), "whsec_new$1");
    expect(saved).toEqual({ file: "../.env", replaced: true, wrote: true });
    expect(await readFile(join(root, ".env"), "utf8")).toBe(
      "COSS_API_KEY=coss_test_x\nCOSS_WEBHOOK_SECRET=whsec_new$1\n",
    );
  });

  test("creates .env.local mode 0600 in a Next.js project", async () => {
    const root = await tree({
      "package.json": JSON.stringify({ dependencies: { next: "16.0.0" } }),
    });
    const saved = await saveWebhookSecret(root, "whsec_next");
    expect(saved).toEqual({ file: ".env.local", replaced: false, wrote: true });
    const path = join(root, ".env.local");
    expect(await readFile(path, "utf8")).toBe("COSS_WEBHOOK_SECRET=whsec_next\n");
    expect((await stat(path)).mode & 0o777).toBe(0o600);
  });

  test("leaves the file alone when the secret is already there", async () => {
    const root = await tree({ ".env": "COSS_WEBHOOK_SECRET=whsec_same\n" });
    const saved = await saveWebhookSecret(root, "whsec_same");
    expect(saved).toEqual({ file: ".env", replaced: false, wrote: false });
    expect(await readFile(join(root, ".env"), "utf8")).toBe("COSS_WEBHOOK_SECRET=whsec_same\n");
  });
});
