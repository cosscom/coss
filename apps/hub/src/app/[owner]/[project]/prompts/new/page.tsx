import { notFound } from "next/navigation";
import { NewPromptForm } from "@/components/thread/new-prompt-form";
import { requireViewer } from "@/lib/session";
import { getProject } from "@/lib/store";
import { CHANGE_KIND_LABELS } from "@/lib/types";

/** One chat box in the middle of the page: the Prompt Request, in English. */
export default async function NewPromptRequest({
  params,
  searchParams,
}: PageProps<"/[owner]/[project]/prompts/new">) {
  const { owner, project: slug } = await params;
  const { error } = await searchParams;
  const project = getProject(owner, slug);
  if (!project) notFound();
  await requireViewer(`/${owner}/${slug}/prompts/new`);
  return (
    <main className="container flex w-full flex-1 flex-col items-center justify-center gap-8 py-16 sm:py-24">
      <div className="flex max-w-2xl flex-col items-center gap-3 text-center">
        <h1 className="font-semibold text-4xl tracking-[-0.03em] sm:text-5xl">
          New Prompt Request
        </h1>
        <p className="max-w-xl text-muted-foreground">
          What should {project.name} do differently? Where it happens, what should change, what you
          expect afterwards. Screenshots help. The hub asks back if a factory couldn't start from
          it.
        </p>
      </div>
      <div className="w-full max-w-3xl">
        <NewPromptForm owner={owner} project={slug} projectName={project.name} />
      </div>
      {typeof error === "string" && error && (
        <p className="text-destructive-foreground text-sm" role="alert">
          {error}
        </p>
      )}
      <p className="max-w-xl text-center text-muted-foreground text-xs">
        0 lines of code. {project.autoAllow.map((kind) => CHANGE_KIND_LABELS[kind]).join(", ")}{" "}
        changes go straight to {project.factory}; everything else waits for a maintainer.{" "}
        {project.factory} builds, tests and deploys a preview, and reports back in the thread.
      </p>
    </main>
  );
}
