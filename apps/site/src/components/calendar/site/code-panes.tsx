import { cn } from "@coss/ui/lib/utils";
import { Braces, FileCode, Terminal } from "lucide-react";
import type { ReactNode } from "react";
import { CopyButton } from "./copy-button";
import { ScrollPre } from "./scroll-pre";

export type CodePane = {
  /** file name or "terminal"; shown in the pane's title bar */
  title: string;
  code: string;
  /** `await highlight(code, lang)` from ./highlight; plain text when omitted */
  html?: string;
  /** shell line: prefixed with a non-selectable `$` */
  command?: boolean;
  /** what the button copies; defaults to `code`, `false` hides the button */
  copy?: string | false;
  copyLabel?: string;
  /** wrap long lines instead of scrolling */
  wrap?: boolean;
};

function Glyph({ title }: { title: string }) {
  const Icon = /^(terminal|shell|sh|bash|zsh|\$)$/i.test(title)
    ? Terminal
    : /\.json$/.test(title)
      ? Braces
      : FileCode;
  return <Icon aria-hidden className="size-3.5 shrink-0" />;
}

const BODY = "px-4 py-3.5 font-mono text-sm leading-6";

function Body({ pane, children }: { pane: CodePane; children: ReactNode }) {
  return pane.wrap ? (
    <pre className={cn(BODY, "whitespace-pre-wrap wrap-anywhere")}>{children}</pre>
  ) : (
    <ScrollPre label={`${pane.title} code`} className={BODY}>
      {children}
    </ScrollPre>
  );
}

/** One framed stack of code panes on the code surface tokens. Works in server and client components. */
export function CodePanes({ panes, className }: { panes: CodePane[]; className?: string }) {
  return (
    <div
      data-slot="code-panes"
      className={cn(
        "overflow-clip rounded-xl border bg-code text-code-foreground shadow-xs",
        className,
      )}
    >
      {panes.map((pane) => {
        const copy = pane.copy === false ? null : (pane.copy ?? pane.code);
        return (
          <figure key={pane.title} data-code-pane className="border-b last:border-b-0">
            <div className="flex h-9 items-center gap-2 border-b px-3 font-mono text-xs text-muted-foreground">
              <Glyph title={pane.title} />
              <figcaption className="flex-1 truncate">{pane.title}</figcaption>
              {copy != null && (
                <CopyButton
                  size="icon-xs"
                  text={copy}
                  label={pane.copyLabel ?? `Copy ${pane.title}`}
                />
              )}
            </div>
            <Body pane={pane}>
              <code data-code-command={pane.command || undefined}>
                {pane.command && <span className="select-none text-muted-foreground">$ </span>}
                {pane.html ? (
                  <span
                    className="[&_span]:text-(--shiki-light) dark:[&_span]:text-(--shiki-dark)"
                    dangerouslySetInnerHTML={{ __html: pane.html }}
                  />
                ) : (
                  pane.code
                )}
              </code>
            </Body>
          </figure>
        );
      })}
    </div>
  );
}
