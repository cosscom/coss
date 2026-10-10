import { listProjects } from "@coss/tenancy";
import { Card, CardPanel } from "@coss/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";
import { CreateProjectForm } from "./create-project-form";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({ params }: PageProps<"/[orgSlug]">) {
  const { orgSlug } = await params;
  const { organization, can } = await requireOrgMember(orgSlug);
  const projects = await listProjects({ organizationId: organization.id });
  const canCreate = can({ project: ["create"] });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description="Each project has a production (live) and a development (sandbox) environment."
        title="Projects"
      />
      {canCreate ? <CreateProjectForm orgSlug={organization.slug} /> : null}
      <Card>
        <CardPanel className="p-2">
          {projects.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">
              No projects yet.{canCreate ? " Create one to get API keys." : ""}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <Link
                        className="font-medium underline-offset-4 hover:underline"
                        href={`/${organization.slug}/projects/${project.slug}`}
                      >
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {project.slug}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(project.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardPanel>
      </Card>
    </div>
  );
}
