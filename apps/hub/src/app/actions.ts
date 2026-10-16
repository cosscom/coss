"use server";

import { refresh } from "next/cache";
import { currentViewer } from "@/lib/session";
import { getProject, toggleStar, toggleWatch } from "@/lib/store";

export async function starProject(owner: string, slug: string): Promise<boolean> {
  const project = getProject(owner, slug);
  if (!project) return false;
  const viewer = await currentViewer();
  if (!viewer?.onboarded) return false;
  const starred = toggleStar(viewer.user.handle, project);
  refresh();
  return starred;
}

export async function watchProject(owner: string, slug: string): Promise<boolean> {
  const project = getProject(owner, slug);
  if (!project) return false;
  const viewer = await currentViewer();
  if (!viewer?.onboarded) return false;
  const watching = toggleWatch(viewer.user.handle, project);
  refresh();
  return watching;
}
