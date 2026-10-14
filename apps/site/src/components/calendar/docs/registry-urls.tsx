import { highlight } from "fumadocs-core/highlight";
import type { ComponentProps } from "react";
import { registryConfigJson, registryIndexUrl } from "@/lib/calendar/registry-public";
import { CodeBlock, type CodeBlockProps } from "./ui/code-block";

const RegistryPre = (props: ComponentProps<"pre">) => (
  <CodeBlock {...(props as CodeBlockProps)} title="components.json" />
);

/** Keep the copied shadcn configuration aligned with the deployed registry. */
export async function RegistryConfig() {
  return highlight(registryConfigJson(), {
    lang: "json",
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
    components: { pre: RegistryPre },
  });
}

export function RegistryIndexUrl() {
  return registryIndexUrl();
}
