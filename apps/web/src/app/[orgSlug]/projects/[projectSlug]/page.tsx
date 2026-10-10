import { redirect } from "next/navigation";

/** A project has no page of its own: open its development (sandbox) environment. */
export default async function ProjectPage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]">) {
  const { orgSlug, projectSlug } = await params;
  redirect(`/${orgSlug}/projects/${projectSlug}/development`);
}
