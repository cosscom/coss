import { readFile } from "node:fs/promises";
import path from "node:path";
import { cn } from "@coss/ui/lib/utils";
import { highlight } from "fumadocs-core/highlight";
import type { ComponentProps } from "react";
import { ExampleFrame } from "./example-frame";
import { ExamplePreview } from "./example-preview";
import { exampleBySlug } from "./examples/registry";
import { CodeBlock, type CodeBlockProps } from "./ui/code-block";

const ROOT = path.join(process.cwd(), "src/components/calendar/docs/examples");
const THEMES = { light: "github-light", dark: "github-dark" };

async function readExampleFile(slug: string, file: string) {
  try {
    return await readFile(path.join(ROOT, slug, file), "utf8");
  } catch {
    return null;
  }
}

// fills the pane the frame sizes for it; the code scrolls inside
const FlushPre = ({ className, ...props }: ComponentProps<"pre">) => (
  <CodeBlock
    {...(props as CodeBlockProps)}
    flush
    className={cn(className, "h-full items-stretch")}
  />
);

const SHARED = "../parts.tsx";

async function highlighted(slug: string, file: string) {
  const code = await readExampleFile(slug, file);
  if (code === null) return null;
  const node = await highlight(code, {
    lang: file.endsWith(".tsx") ? "tsx" : "ts",
    themes: THEMES,
    defaultColor: false,
    components: { pre: FlushPre },
  });
  return { name: path.basename(file), code: node, source: code };
}

export async function Example({ name }: { name: string }) {
  const entry = exampleBySlug(name);
  if (!entry) throw new Error(`Unknown example "${name}" — add it to examples/registry.ts`);
  const own = (
    await Promise.all(["index.tsx", "data.ts"].map((file) => highlighted(name, file)))
  ).filter((f) => f !== null);
  // the shared bar / nav file is part of the source a reader copies, so it gets a tab wherever it is imported
  const shared = own.some((f) => f.source.includes('from "../parts"'))
    ? await highlighted(name, SHARED)
    : null;
  const files = [...own, ...(shared ? [shared] : [])].map(({ name: file, code }) => ({
    name: file,
    code,
  }));
  return (
    <ExampleFrame
      slug={name}
      title={entry.title}
      uses={entry.uses}
      preview={<ExamplePreview name={name} />}
      files={files}
    />
  );
}
