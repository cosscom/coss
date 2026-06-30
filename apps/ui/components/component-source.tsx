import fs from "node:fs/promises";
import path from "node:path";
import { CodeBlock } from "@coss/ui/shared/code-block";
import type * as React from "react";
import { CodeCollapsibleWrapper } from "@/components/code-collapsible-wrapper";
import {
  type ComponentSourceTab,
  ComponentSourceTabs,
} from "@/components/component-source-tabs";
import { getRegistryItem } from "@/lib/registry";
import { cn } from "@/lib/utils";

type RegistryFile = {
  path: string;
  target?: string;
  content?: string;
};

const NON_CODE_EXTENSIONS = new Set([
  "avif",
  "bmp",
  "gif",
  "ico",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
]);

function getRegistryFileTitle(file: RegistryFile) {
  if (file.target) {
    return file.target;
  }

  return file.path.split("/").pop() ?? file.path;
}

function getRegistryFileTabTitle(file: RegistryFile) {
  const title = getRegistryFileTitle(file);
  return title.split("/").pop() ?? title;
}

function getRegistryFileId(file: RegistryFile) {
  return `${file.path}:${file.target ?? ""}`;
}

function getRegistryFileExtension(file: RegistryFile): string {
  const raw = getRegistryFileTitle(file);
  const extension = raw.split(".").pop()?.toLowerCase() ?? "";
  return extension;
}

function isRenderableSourceFile(file: RegistryFile): boolean {
  return !NON_CODE_EXTENSIONS.has(getRegistryFileExtension(file));
}

function getLanguage(file: RegistryFile, language?: string) {
  if (language) {
    return language;
  }

  const extension = getRegistryFileTabTitle(file).split(".").pop();
  return extension ?? "tsx";
}

async function buildRegistrySourceTabs(
  files: RegistryFile[],
  language?: string,
): Promise<ComponentSourceTab[]> {
  const tabs: ComponentSourceTab[] = [];

  for (const file of files) {
    if (!file.content) {
      continue;
    }

    tabs.push({
      panel: (
        <CodeBlock
          code={file.content}
          copyButton
          language={getLanguage(file, language)}
          showLineNumbers
          title={getRegistryFileTitle(file)}
        />
      ),
      title: getRegistryFileTabTitle(file),
      value: getRegistryFileId(file),
    });
  }

  return tabs;
}

export async function ComponentSource({
  name,
  src,
  title,
  language,
  collapsible = true,
  className,
}: React.ComponentProps<"div"> & {
  name?: string;
  src?: string;
  title?: string;
  language?: string;
  collapsible?: boolean;
}) {
  if (!name && !src) {
    return null;
  }

  if (name) {
    const item = await getRegistryItem(name);
    const files =
      item?.files?.filter(
        (file: RegistryFile) => file.content && isRenderableSourceFile(file),
      ) ?? [];

    if (files.length > 1) {
      const tabs = await buildRegistrySourceTabs(files, language);
      const tabbedSource = (
        <ComponentSourceTabs className={className} tabs={tabs} />
      );

      if (collapsible) {
        return <CodeCollapsibleWrapper>{tabbedSource}</CodeCollapsibleWrapper>;
      }

      return tabbedSource;
    }

    const code = files[0]?.content;

    if (!code) {
      return null;
    }

    const lang = language ?? getLanguage(files[0], language);

    if (!collapsible) {
      return (
        <div className={cn("relative", className)}>
          <CodeBlock code={code} language={lang} title={title} />
        </div>
      );
    }

    return (
      <CodeCollapsibleWrapper className={className}>
        <CodeBlock code={code} language={lang} title={title} />
      </CodeCollapsibleWrapper>
    );
  }

  if (src) {
    const file = await fs.readFile(path.join(process.cwd(), src), "utf-8");
    const lang = language ?? title?.split(".").pop() ?? "tsx";

    if (!collapsible) {
      return (
        <div className={cn("relative", className)}>
          <CodeBlock code={file} language={lang} title={title} />
        </div>
      );
    }

    return (
      <CodeCollapsibleWrapper className={className}>
        <CodeBlock code={file} language={lang} title={title} />
      </CodeCollapsibleWrapper>
    );
  }

  return null;
}
