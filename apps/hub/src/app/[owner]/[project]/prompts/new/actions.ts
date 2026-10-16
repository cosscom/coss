"use server";

import { redirect } from "next/navigation";
import { hubFactory, hubTriager } from "@/lib/runtime";
import { currentViewer } from "@/lib/session";
import { getProject, storeAttachment } from "@/lib/store";
import { titleOf } from "@/lib/title";
import type { Attachment } from "@/lib/types";
import { HubError, openPromptRequest } from "@/lib/workflow";

export type OpenResult = { ok: true; number: number } | { ok: false; error: string };

const ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;
const ATTACHMENT_MAX_COUNT = 6;
const ATTACHMENT_TYPES =
  /^(image\/(png|jpeg|gif|webp|svg\+xml)|video\/(mp4|quicktime|webm)|application\/pdf|text\/plain)$/;

/**
 * Opens a Prompt Request from one message, the way a chat box sends it: `body`, plus any
 * `files` (screenshots, recordings, PDFs) the author attached.
 */
export async function openPrompt(form: FormData): Promise<OpenResult> {
  const owner = String(form.get("owner") ?? "");
  const project = String(form.get("project") ?? "");
  if (!getProject(owner, project)) return { ok: false, error: "Project not found." };
  const viewer = await currentViewer();
  if (!viewer) return { ok: false, error: "Sign in to open a prompt request." };
  if (!viewer.onboarded) return { ok: false, error: "Finish setting up your profile first." };
  const body = String(form.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "Describe the change." };

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > ATTACHMENT_MAX_COUNT)
    return { ok: false, error: `${ATTACHMENT_MAX_COUNT} files at most.` };
  const attachments: Attachment[] = [];
  for (const file of files) {
    if (!ATTACHMENT_TYPES.test(file.type))
      return { ok: false, error: `${file.name}: images, videos, PDFs or text only.` };
    if (file.size > ATTACHMENT_MAX_BYTES)
      return { ok: false, error: `${file.name}: 8 MB at most.` };
    attachments.push(
      storeAttachment({
        name: file.name,
        type: file.type,
        bytes: new Uint8Array(await file.arrayBuffer()),
      }),
    );
  }

  try {
    const pr = await openPromptRequest(
      { owner, project, author: viewer.user.handle, title: titleOf(body), body, attachments },
      { factory: hubFactory(), triager: hubTriager() },
    );
    return { ok: true, number: pr.number };
  } catch (error) {
    if (error instanceof HubError) return { ok: false, error: error.message };
    console.error("[hub] opening a prompt request failed:", error);
    return { ok: false, error: "Something went wrong. Try again." };
  }
}

/** For a plain form post (no JavaScript): same thing, then the thread. */
export async function openPromptForm(form: FormData): Promise<void> {
  const owner = String(form.get("owner") ?? "");
  const project = String(form.get("project") ?? "");
  const result = await openPrompt(form);
  if (result.ok) redirect(`/${owner}/${project}/prompts/${result.number}`);
  redirect(`/${owner}/${project}/prompts/new?error=${encodeURIComponent(result.error)}`);
}
