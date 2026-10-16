"use client";

import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@coss/ui/components/card";
import { Textarea } from "@coss/ui/components/textarea";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decidePrompt } from "@/app/[owner]/[project]/prompts/[number]/actions";

/** The maintainers' decision: a comment, then Approve or Decline (the comment is required either way). */
export function ApprovalCard({
  target,
  title,
  author,
  kind,
}: {
  target: { owner: string; project: string; number: number };
  title: string;
  author: string;
  kind: string;
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const submit = (decision: "approved" | "declined") =>
    start(async () => {
      const result = await decidePrompt({ ...target, decision, comment });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  return (
    <Card className="w-full max-w-xl">
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-sm">Review Prompt Request #{target.number}</CardTitle>
        <CardDescription className="text-xs">
          {title} · {kind} · opened by @{author}
        </CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-2 p-4">
        <Textarea
          aria-label="Comment"
          disabled={pending}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Add a comment. Required either way: the author reads it, and the factory does too."
          rows={3}
          size="sm"
          value={comment}
        />
        {error && (
          <p className="text-destructive-foreground text-xs" role="alert">
            {error}
          </p>
        )}
      </CardPanel>
      <CardFooter className="justify-end gap-2 p-4 pt-0">
        <Button disabled={pending} onClick={() => submit("declined")} size="sm" variant="outline">
          Decline with comment
        </Button>
        <Button disabled={pending} onClick={() => submit("approved")} size="sm">
          {pending ? "Sending…" : "Approve"}
        </Button>
      </CardFooter>
    </Card>
  );
}
