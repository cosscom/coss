"use client";

import { Button } from "@coss/ui/components/button";
import {
  Composer,
  ComposerActionGroup,
  ComposerActions,
  ComposerInput,
  ComposerSubmit,
  type ComposerValue,
  getComposerText,
} from "@coss/ui/components/composer";
import { ArrowUpIcon, FileIcon, PaperclipIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ClipboardEvent, useEffect, useId, useRef, useState, useTransition } from "react";
import { openPrompt } from "@/app/[owner]/[project]/prompts/new/actions";

const MAX_FILES = 6;
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT =
  "image/png,image/jpeg,image/gif,image/webp,image/svg+xml,video/mp4,video/quicktime,video/webm,application/pdf,text/plain";

type Picked = { file: File; url: string | null };

/**
 * One chat box: describe the change, attach screenshots or a recording, send. The hub reads it
 * and asks back if it isn't enough; the title is the first sentence.
 */
export function NewPromptForm({
  owner,
  project,
  projectName,
}: {
  owner: string;
  project: string;
  projectName: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState<ComposerValue>([]);
  const [files, setFiles] = useState<Picked[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileId = useId();
  const root = useRef<HTMLDivElement>(null);

  // The box is the page: the caret is in it when the page opens.
  useEffect(() => {
    root.current?.querySelector<HTMLElement>("[data-slot=composer-input]")?.focus();
  }, []);

  const add = (picked: FileList | File[] | null) => {
    if (!picked) return;
    const next = [...files];
    for (const file of Array.from(picked)) {
      if (next.length >= MAX_FILES) {
        setError(`${MAX_FILES} files at most.`);
        break;
      }
      if (file.size > MAX_BYTES) {
        setError(`${file.name}: 8 MB at most.`);
        continue;
      }
      next.push({ file, url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null });
    }
    setFiles(next);
  };

  const onPaste = (event: ClipboardEvent) => {
    const pasted = Array.from(event.clipboardData.files ?? []);
    if (pasted.length > 0) add(pasted);
  };

  const send = (text: string) => {
    const body = text.trim();
    if (!body) return;
    setError(null);
    start(async () => {
      const form = new FormData();
      form.set("owner", owner);
      form.set("project", project);
      form.set("body", body);
      for (const { file } of files) form.append("files", file);
      const result = await openPrompt(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/${owner}/${project}/prompts/${result.number}`);
      router.refresh();
    });
  };

  return (
    <div className="flex w-full flex-col items-center gap-3" onPaste={onPaste} ref={root}>
      <Composer
        className="w-full [--composer-radius:1.75rem] shadow-sm/5"
        disabled={pending}
        layout="adaptive"
        onSubmit={(next) => send(getComposerText(next))}
        onValueChange={(next) => setValue(next)}
        submitOnEnter="desktop"
        value={value}
      >
        <ComposerActions>
          <ComposerActionGroup align="start">
            <Button
              aria-label="Attach files"
              className="rounded-full before:rounded-full"
              onClick={() => document.getElementById(fileId)?.click()}
              size="icon"
              type="button"
              variant="ghost"
            >
              <PaperclipIcon aria-hidden className="size-4" />
            </Button>
            <input
              accept={ACCEPT}
              className="sr-only"
              id={fileId}
              multiple
              onChange={(event) => {
                add(event.target.files);
                event.target.value = "";
              }}
              type="file"
            />
          </ComposerActionGroup>
        </ComposerActions>
        <ComposerInput
          aria-label="Your Prompt Request"
          autoFocus
          className="text-base md:text-base"
          placeholder={`Describe a change to ${projectName}…`}
        />
        <ComposerActions>
          <ComposerActionGroup align="end">
            <ComposerSubmit
              render={
                <Button
                  aria-label="Send"
                  className="rounded-full before:rounded-full"
                  loading={pending}
                  size="icon"
                >
                  <ArrowUpIcon aria-hidden className="size-4" />
                </Button>
              }
            />
          </ComposerActionGroup>
        </ComposerActions>
      </Composer>
      {files.length > 0 && (
        <ul className="flex w-full flex-wrap gap-2">
          {files.map(({ file, url }, index) => (
            <li
              className="group relative flex items-center gap-2 rounded-lg border bg-popover p-1.5 pe-2 text-xs"
              key={`${file.name}-${index.toString()}`}
            >
              {url ? (
                // biome-ignore lint/performance/noImgElement: a local object URL preview.
                <img alt="" className="size-10 rounded-md object-cover" src={url} />
              ) : (
                <span className="flex size-10 items-center justify-center rounded-md bg-muted">
                  <FileIcon aria-hidden className="size-4 text-muted-foreground" />
                </span>
              )}
              <span className="max-w-40 truncate">{file.name}</span>
              <button
                aria-label={`Remove ${file.name}`}
                className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                onClick={() => setFiles(files.filter((_, i) => i !== index))}
                type="button"
              >
                <XIcon aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-muted-foreground text-xs">
        Attach screenshots, a recording or a PDF: paste, or the paperclip.
      </p>
      {error && (
        <p className="text-destructive-foreground text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
