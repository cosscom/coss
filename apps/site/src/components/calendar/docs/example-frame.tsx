"use client";

import { Button } from "@coss/ui/components/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@coss/ui/components/tooltip";
import { RefreshCw } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Dot, Live, LiveFrame } from "./ui/live-frame";
import { Chip } from "./ui/pin";
import { UnderlinePanel, UnderlineTab, UnderlineTabList, UnderlineTabs } from "./ui/tabs";

export function ExampleFrame({
  slug,
  title,
  uses,
  preview,
  files,
}: {
  slug: string;
  title: string;
  uses: string[];
  preview: ReactNode;
  files: { name: string; code: ReactNode }[];
}) {
  const [tab, setTab] = useState("preview");
  const [epoch, setEpoch] = useState(0);

  // the source panes take the preview's height, so switching tabs never moves the page under the frame
  const previewRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const watch = new ResizeObserver(() => {
      if (el.offsetHeight > 0) setHeight(el.offsetHeight);
    });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  return (
    <LiveFrame data-example={slug}>
      <UnderlineTabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 border-b ps-4 pe-1">
          <p className="flex min-w-0 items-center gap-2 py-2.5 font-mono text-xs text-muted-foreground">
            <Live />
            <Dot />
            <span className="truncate text-foreground">{title}</span>
          </p>
          <div className="-ms-2 flex min-w-0 basis-full items-center justify-between gap-1 @lg:ms-0 @lg:basis-auto">
            <div className="min-w-0 overflow-x-auto px-0.5 pb-px">
              <UnderlineTabList size="xs" aria-label="Preview or source">
                <UnderlineTab value="preview">Preview</UnderlineTab>
                {files.map((f) => (
                  <UnderlineTab key={f.name} value={f.name}>
                    {f.name}
                  </UnderlineTab>
                ))}
              </UnderlineTabList>
            </div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0"
                    aria-label="Restart preview"
                    onClick={() => {
                      setTab("preview");
                      setEpoch((e) => e + 1);
                    }}
                  />
                }
              >
                <RefreshCw />
              </TooltipTrigger>
              <TooltipPopup>Restart preview</TooltipPopup>
            </Tooltip>
          </div>
        </div>
        <UnderlinePanel value="preview" keepMounted className="bg-background">
          <div ref={previewRef}>
            <div key={epoch}>{preview}</div>
          </div>
        </UnderlinePanel>
        {files.map((f) => (
          <UnderlinePanel
            key={f.name}
            value={f.name}
            keepMounted
            className="flex-none overflow-hidden"
            style={{ height }}
          >
            {f.code}
          </UnderlinePanel>
        ))}
        {uses.length > 0 && (
          <p className="flex flex-wrap items-center gap-1.5 border-t px-4 py-2.5 font-mono text-xs text-muted-foreground">
            <span className="me-1">uses</span>
            {uses.map((u) => (
              <Chip key={u}>{u}</Chip>
            ))}
          </p>
        )}
      </UnderlineTabs>
    </LiveFrame>
  );
}
