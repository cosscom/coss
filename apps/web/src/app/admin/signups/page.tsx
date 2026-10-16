import { listRiskAssessments } from "@coss/risk";
import { ListRiskAssessmentsQuery } from "@coss/risk/schemas";
import {
  type AdminUserSummary,
  listUsersForAdmin,
  usersByEmailForAdmin,
} from "@coss/tenancy/admin";
import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
import { Badge } from "@coss/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { UserPlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { listHref, stringParam } from "@/components/admin/list-controls";
import { UserStatusBadge } from "@/components/admin/status-badges";
import { CursorPager } from "@/components/cursor-pager";
import { EmptyState } from "@/components/empty-state";
import { FilterLinks } from "@/components/filter-links";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelBody } from "@/components/panel";
import { RiskDecisionBadge } from "@/components/risk-badges";
import { formatDateTime, formatRelative } from "@/lib/format";
import { signUpRiskScope } from "@/lib/risk";
import { requirePlatformAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Sign-ups" };

const PAGE_SIZE = 50;

const VIEWS = [
  { value: "all", label: "All" },
  { value: "block", label: "Blocked" },
  { value: "review", label: "Review" },
  { value: "allow", label: "Allowed" },
] as const;

function Organizations({ user }: { user: AdminUserSummary }) {
  if (user.organizations.length === 0) {
    return <span className="text-muted-foreground">none</span>;
  }
  return (
    <span className="flex flex-wrap gap-x-2 gap-y-1">
      {user.organizations.map((organization) => (
        <span className="inline-flex items-center gap-1" key={organization.id}>
          <Link className="hover:underline" href={`/admin/organizations/${organization.id}`}>
            {organization.name}
          </Link>
          {organization.suspended ? <Badge variant="error">suspended</Badge> : null}
        </span>
      ))}
    </span>
  );
}

/**
 * coss.com's own sign-ups as coss.com Risk assessed them (`RISK_SIGNUP_ENVIRONMENT_ID`), with the account
 * each one became. Refused sign-ups have no account.
 */
export default async function AdminSignUpsPage({ searchParams }: PageProps<"/admin/signups">) {
  await requirePlatformAdmin();
  const search = await searchParams;
  const scope = await signUpRiskScope();
  const now = new Date();

  if (!scope) {
    const { users } = await listUsersForAdmin({ limit: PAGE_SIZE });
    return (
      <div className="flex flex-col gap-6">
        <PageHeader description="The newest accounts." title="Sign-ups" />
        <Alert variant="warning">
          <AlertTitle>Sign-ups aren't assessed</AlertTitle>
          <AlertDescription>
            Set RISK_SIGNUP_ENVIRONMENT_ID to a live environment of coss.com's own organization to
            score every sign-up with coss.com Risk (disposable and undeliverable addresses, IP
            reputation, velocity, duplicate mailboxes) and list the decisions here.
          </AlertDescription>
        </Alert>
        <Panel>
          <Table variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>Signed up</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell
                    className="whitespace-nowrap text-muted-foreground"
                    title={formatDateTime(user.createdAt)}
                  >
                    {formatRelative(user.createdAt, now)}
                  </TableCell>
                  <TableCell>
                    <Link className="font-medium hover:underline" href={`/admin/users/${user.id}`}>
                      {user.email}
                    </Link>
                    {user.emailVerified ? null : (
                      <Badge className="ms-2" variant="outline">
                        unverified
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <UserStatusBadge banned={user.banned} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </div>
    );
  }

  const view = VIEWS.find((option) => option.value === stringParam(search.view)) ?? VIEWS[0];
  const after = stringParam(search.after) || undefined;
  const query = ListRiskAssessmentsQuery.safeParse({
    event: "signup",
    ...(view.value === "all" ? {} : { decision: view.value }),
    after,
    limit: PAGE_SIZE,
  });
  const page = query.success
    ? await listRiskAssessments(scope, query.data)
    : { data: [], has_more: false };
  const users = await usersByEmailForAdmin(
    page.data.flatMap((assessment) => (assessment.user.email ? [assessment.user.email] : [])),
  );
  const viewParam = view.value === "all" ? undefined : view.value;
  const last = page.data.at(-1);

  return (
    <div className="flex flex-col gap-6" data-page-width="full">
      <PageHeader
        description="Every sign-up as coss.com Risk assessed it, newest first. Blocked sign-ups were refused and have no account; the address, IP and user agent are kept for 90 days."
        title="Sign-ups"
      />
      <FilterLinks
        options={VIEWS.map((option) => ({
          value: option.value,
          label: option.label,
          href: listHref("/admin/signups", {
            view: option.value === "all" ? undefined : option.value,
          }),
        }))}
        value={view.value}
      />
      <Panel>
        {page.data.length === 0 ? (
          <PanelBody flush>
            <EmptyState
              compact
              description="No sign-up matches this view."
              icon={UserPlusIcon}
              title="No sign-ups"
            />
          </PanelBody>
        ) : (
          <Table variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Reasons</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Organizations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.data.map((assessment) => {
                const email = assessment.user.email;
                const user = email ? users.get(email.toLowerCase()) : undefined;
                const ip = assessment.signals.ip;
                return (
                  <TableRow key={assessment.id}>
                    <TableCell
                      className="whitespace-nowrap text-muted-foreground"
                      title={formatDateTime(assessment.created_at)}
                    >
                      {formatRelative(assessment.created_at, now)}
                    </TableCell>
                    <TableCell className="max-w-64 truncate font-medium" title={email ?? ""}>
                      {user ? (
                        <Link className="hover:underline" href={`/admin/users/${user.id}`}>
                          {email}
                        </Link>
                      ) : (
                        (email ?? <span className="text-muted-foreground">forgotten</span>)
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <RiskDecisionBadge decision={assessment.decision} />
                        <span className="font-mono text-muted-foreground text-xs">
                          {assessment.score.toFixed(2)}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="max-w-96 whitespace-normal text-sm">
                      {assessment.reasons.length > 0
                        ? assessment.reasons.map((reason) => reason.message).join(" · ")
                        : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">
                      {assessment.ip ?? "—"}
                      {ip?.country ? (
                        <span className="text-muted-foreground"> · {ip.country}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {user ? (
                        <UserStatusBadge banned={user.banned} />
                      ) : (
                        <span className="text-muted-foreground">
                          {assessment.decision === "block" ? "refused" : "none"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{user ? <Organizations user={user} /> : null}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
      <CursorPager
        newestHref={after ? listHref("/admin/signups", { view: viewParam }) : undefined}
        olderHref={
          page.has_more && last
            ? listHref("/admin/signups", { view: viewParam, after: last.id })
            : undefined
        }
        summary={`${page.data.length} sign-ups`}
      />
    </div>
  );
}
