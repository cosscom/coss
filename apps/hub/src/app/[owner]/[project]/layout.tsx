import { Badge } from "@coss/ui/components/badge";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectActions } from "@/components/project/project-actions";
import { ProjectTabs } from "@/components/project/project-tabs";
import { UserAvatar } from "@/components/user-avatar";
import { currentUser } from "@/lib/session";
import { countOpen, getProject, hasStarred, isWatching, listPromptRequests } from "@/lib/store";

/** GitHub's repository header, without the code: owner / project, Watch and Star, the tabs. */
export default async function ProjectLayout({
  children,
  params,
}: LayoutProps<"/[owner]/[project]">) {
  const { owner, project: slug } = await params;
  const project = getProject(owner, slug);
  if (!project) notFound();
  const user = await currentUser();
  const handle = user?.handle ?? "";
  const base = `/${owner}/${slug}`;
  return (
    <>
      <div className="border-b bg-sidebar/40">
        <div className="container flex w-full flex-col gap-4 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <UserAvatar className="size-7" handle={owner} square />
              <h1 className="flex items-center gap-1.5 text-lg">
                <Link className="text-muted-foreground hover:underline" href={`/${owner}`}>
                  {owner}
                </Link>
                <span className="text-muted-foreground">/</span>
                <Link className="font-semibold hover:underline" href={base}>
                  {project.name}
                </Link>
              </h1>
              <Badge className="px-2" variant="outline">
                Public
              </Badge>
            </div>
            <ProjectActions
              owner={owner}
              slug={slug}
              starred={hasStarred(handle, project)}
              stars={project.stars}
              watchers={project.watchers}
              watching={isWatching(handle, project)}
            />
          </div>
          <ProjectTabs
            base={base}
            building={listPromptRequests({ owner, project: slug, status: "building" }).length}
            open={countOpen(owner, slug)}
          />
        </div>
      </div>
      {children}
    </>
  );
}
