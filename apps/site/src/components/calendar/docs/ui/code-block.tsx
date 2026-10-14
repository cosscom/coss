import { ScrollArea } from "@coss/ui/components/scroll-area";
import { cn } from "@coss/ui/lib/utils";
import { Braces, FileCode, Terminal } from "lucide-react";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { CodeCopy } from "./code-copy";

export type CodeBlockProps = Omit<ComponentProps<"figure">, "title"> & {
  title?: ReactNode;
  /** fumadocs passes a language icon as an svg string; the frame draws its own glyph */
  icon?: ReactNode;
  allowCopy?: boolean | "true" | "false";
  /** no outer frame — for a block that sits inside another frame */
  flush?: boolean;
  "data-line-numbers"?: boolean;
  "data-line-numbers-start"?: number;
};

function Glyph({ title }: { title?: string }) {
  const Icon =
    !title || /^(terminal|shell|sh|bash|zsh|\$)$/i.test(title)
      ? Terminal
      : /\.json$/.test(title)
        ? Braces
        : FileCode;
  return <Icon aria-hidden className="size-3.5 shrink-0" />;
}

export function CodeBlock({
  title,
  allowCopy = true,
  flush,
  className,
  style,
  children,
  ...rest
}: CodeBlockProps) {
  const props = { ...rest };
  delete props.icon;
  const copy = allowCopy !== false && allowCopy !== "false";
  const label = typeof title === "string" ? title : undefined;
  const lineStart = Number(props["data-line-numbers-start"] ?? 1) - 1;
  return (
    <figure
      dir="ltr"
      {...props}
      tabIndex={undefined}
      className={cn(
        "docs-code group/code not-prose relative overflow-hidden bg-code text-code-foreground",
        flush ? "my-0" : "my-6 rounded-xl border shadow-xs",
        !title && "flex items-start",
        className,
      )}
      style={{ ...style, "--padding-left": "1rem", "--padding-right": "1rem" } as CSSProperties}
    >
      {title && (
        <div className="flex h-9 items-center gap-2 border-b px-3 font-mono text-xs text-muted-foreground">
          <Glyph title={label} />
          <figcaption className="flex-1 truncate">{title}</figcaption>
          {copy && <CodeCopy label={label ? `Copy ${label}` : "Copy code"} className="-me-1" />}
        </div>
      )}
      <ScrollArea
        scrollFade
        clampContentMinWidth={false}
        className="flex max-h-160 min-w-0 flex-1 flex-col"
      >
        <pre
          className="w-max min-w-full py-3.5 font-mono text-sm leading-6 *:flex *:flex-col"
          style={{ counterSet: props["data-line-numbers"] ? `line ${lineStart}` : undefined }}
        >
          {children}
        </pre>
      </ScrollArea>
      {!title && copy && (
        <div className="shrink-0 p-1.5 ps-0">
          <CodeCopy className="opacity-0 group-hover/code:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100" />
        </div>
      )}
    </figure>
  );
}
