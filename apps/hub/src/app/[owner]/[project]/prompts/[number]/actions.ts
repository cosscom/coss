"use server";

import { refresh } from "next/cache";
import { hubFactory, hubTriager } from "@/lib/runtime";
import { currentViewer } from "@/lib/session";
import { getComment, getPromptRequest, toggleReaction } from "@/lib/store";
import { comment, decide, HubError } from "@/lib/workflow";

export type ActionResult = { ok: true } | { ok: false; error: string };

function deps() {
  return { factory: hubFactory(), triager: hubTriager() };
}

async function actor() {
  const viewer = await currentViewer();
  if (!viewer) throw new HubError("Sign in to take part.");
  if (!viewer.onboarded) throw new HubError("Finish setting up your profile first.");
  return viewer.user;
}

async function run(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
    refresh();
    return { ok: true };
  } catch (error) {
    if (error instanceof HubError) return { ok: false, error: error.message };
    console.error("[hub] action failed:", error);
    return { ok: false, error: "Something went wrong. Try again." };
  }
}

export async function postComment(input: {
  owner: string;
  project: string;
  number: number;
  parentId?: string | null;
  body: string;
}): Promise<ActionResult> {
  return run(async () => {
    const pr = getPromptRequest(input.owner, input.project, input.number);
    if (!pr) throw new HubError("This prompt request is gone.");
    const user = await actor();
    await comment(pr, { author: user.handle, body: input.body, parentId: input.parentId }, deps());
  });
}

export async function decidePrompt(input: {
  owner: string;
  project: string;
  number: number;
  decision: "approved" | "declined";
  comment: string;
}): Promise<ActionResult> {
  return run(async () => {
    const pr = getPromptRequest(input.owner, input.project, input.number);
    if (!pr) throw new HubError("This prompt request is gone.");
    const user = await actor();
    await decide(pr, { by: user.handle, decision: input.decision, comment: input.comment }, deps());
  });
}

export async function reactToComment(input: {
  owner: string;
  project: string;
  number: number;
  commentId: string;
  emoji: string;
}): Promise<ActionResult> {
  return run(async () => {
    const pr = getPromptRequest(input.owner, input.project, input.number);
    const comment = pr && getComment(pr, input.commentId);
    if (!pr || !comment) throw new HubError("That comment is gone.");
    const user = await actor();
    toggleReaction(comment, user.handle, input.emoji);
  });
}
