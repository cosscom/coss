import { orgRoleCan } from "@coss/auth/permissions";
import { getTrackingSettings } from "@coss/email";
import { getEnvironment } from "@coss/tenancy";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@coss/ui/components/card";
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
import { notFound } from "next/navigation";
import { ModeBadge, TrackingBadge } from "@/components/email-badges";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";
import {
  CategoryRuleDialog,
  DefaultTrackingForm,
  DeleteTrackingRuleButton,
} from "./tracking-forms";

export const metadata: Metadata = { title: "Tracking" };

export default async function TrackingPage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/tracking">) {
  const { orgSlug, projectSlug, envSlug } = await params;
  const { organization, member } = await requireOrgMember(orgSlug);
  if (!orgRoleCan(member.role, { environment: ["read"] })) notFound();
  const found = await getEnvironment({ organizationId: organization.id, projectSlug, envSlug });
  if (!found) notFound();
  const { project, environment } = found;

  const settings = await getTrackingSettings({
    organizationId: organization.id,
    environmentId: environment.id,
  });
  const base = `/${organization.slug}/projects/${project.slug}/${environment.slug}`;
  const target = {
    orgSlug: organization.slug,
    projectSlug: project.slug,
    envSlug: environment.slug,
  };
  const canEdit = orgRoleCan(member.role, { environment: ["update"] });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href={base}>
          ← {project.name} · {environment.name}
        </Link>
        <PageHeader
          description={
            <>
              COSS can add an invisible image to HTML emails to record opens, and send links through
              a redirect to record clicks. Each email&apos;s settings are fixed when it is sent: its
              own <code>tracking</code> option wins, then the rule for its category, then this
              environment&apos;s default.
            </>
          }
          title={
            <span className="flex items-center gap-2">
              Open &amp; click tracking <ModeBadge mode={environment.mode} />
            </span>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Environment default</CardTitle>
          <CardDescription>
            Applies to emails without a category rule.{" "}
            {settings.default
              ? `Last changed ${formatDateTime(settings.default.updatedAt)}.`
              : "Not set: tracking is off."}
          </CardDescription>
          {canEdit && settings.default ? (
            <CardAction>
              <DeleteTrackingRuleButton {...target} category={null} ruleId={settings.default.id} />
            </CardAction>
          ) : null}
        </CardHeader>
        <CardPanel>
          <DefaultTrackingForm
            {...target}
            canEdit={canEdit}
            clicks={settings.default?.clicks ?? false}
            key={settings.default?.updatedAt.toISOString() ?? "unset"}
            opens={settings.default?.opens ?? false}
          />
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category rules</CardTitle>
          <CardDescription>
            Override the default for emails sent with a <code>category</code>, e.g. track{" "}
            <code>marketing</code> but never <code>password-reset</code>.
          </CardDescription>
          {canEdit ? (
            <CardAction>
              <CategoryRuleDialog {...target} trigger="add" />
            </CardAction>
          ) : null}
        </CardHeader>
        <CardPanel className="p-2">
          {settings.categories.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">No category rules.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Opens</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Updated</TableHead>
                  {canEdit ? <TableHead className="w-0" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.categories.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-mono">{rule.category}</TableCell>
                    <TableCell>
                      <TrackingBadge on={rule.opens} />
                    </TableCell>
                    <TableCell>
                      <TrackingBadge on={rule.clicks} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(rule.updatedAt)}
                    </TableCell>
                    {canEdit ? (
                      <TableCell>
                        <span className="flex gap-2">
                          <CategoryRuleDialog
                            {...target}
                            category={rule.category ?? ""}
                            clicks={rule.clicks}
                            opens={rule.opens}
                            trigger="edit"
                          />
                          <DeleteTrackingRuleButton
                            {...target}
                            category={rule.category}
                            ruleId={rule.id}
                          />
                        </span>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Good to know</CardTitle>
        </CardHeader>
        <CardPanel>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground text-sm">
            <li>Only HTML bodies are tracked; plain-text parts are sent unchanged.</li>
            <li>
              Add <code>data-coss-no-track</code> to a link to keep it as is. <code>mailto:</code>,{" "}
              <code>tel:</code> and merge-tag links are never rewritten.
            </li>
            <li>
              Opens and clicks are attributed to a recipient only when the email had a single one.
            </li>
            <li>
              Some mail clients preload images (inflating opens) and security scanners follow links
              (inflating clicks). Use the counts as signals, not exact numbers.
            </li>
            <li>
              Tracking pixels and rewritten links can affect deliverability and may need consent
              under privacy laws in some regions.
            </li>
          </ul>
        </CardPanel>
      </Card>
    </div>
  );
}
