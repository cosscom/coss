"use client";

import { Button } from "@coss/ui/components/button";
import {
  Composer,
  ComposerActionGroup,
  ComposerActions,
  ComposerInput,
  ComposerSubmit,
  getComposerText,
} from "@coss/ui/components/composer";
import { ArrowUpIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { postComment } from "@/app/[owner]/[project]/prompts/[number]/actions";

type Target = { owner: string; project: string; number: number };

/** The coss ui composer wired to the thread: a top-level comment, or a reply under one. */
export function ThreadComposer({
  target,
  parentId = null,
  placeholder,
  autoFocus = false,
  onSent,
}: {
  target: Target;
  parentId?: string | null;
  placeholder: string;
  autoFocus?: boolean;
  onSent?: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  return (
    <div className="flex flex-col gap-1.5">
      <Composer
        disabled={pending}
        key={key}
        layout="adaptive"
        onSubmit={(value) => {
          const body = getComposerText(value).trim();
          if (!body) return;
          start(async () => {
            const result = await postComment({ ...target, parentId, body });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setError(null);
            setKey((k) => k + 1);
            onSent?.();
            router.refresh();
          });
        }}
        submitOnEnter="desktop"
      >
        <ComposerInput aria-label={placeholder} autoFocus={autoFocus} placeholder={placeholder} />
        <ComposerActions>
          <ComposerActionGroup align="end">
            <ComposerSubmit
              render={
                <Button aria-label="Send" className="rounded-full before:rounded-full" size="icon">
                  <ArrowUpIcon aria-hidden className="size-4" />
                </Button>
              }
            />
          </ComposerActionGroup>
        </ComposerActions>
      </Composer>
      {error && (
        <p className="text-destructive-foreground text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
