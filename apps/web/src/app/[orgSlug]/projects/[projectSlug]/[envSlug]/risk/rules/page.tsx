import { listRiskRules } from "@coss/risk";
import { type RiskRuleConditionOutput, RULE_FIELDS } from "@coss/risk/schemas";
import { getEnvironment } from "@coss/tenancy";
import { Badge } from "@coss/ui/components/badge";
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
import { notFound } from "next/navigation";
import { ModeBadge } from "@/components/email-badges";
import { PageHeader } from "@/components/page-header";
import { RiskDecisionBadge } from "@/components/risk-badges";
import { requireOrgMember } from "@/lib/session";
import { RuleDialog } from "./rule-dialog";
import { DeleteRuleButton, ToggleRuleButton } from "./rule-row-actions";

export const metadata: Metadata = { title: "Risk rules" };

const OPERATOR_TEXT: Record<string, string> = {
  is: "is",
  eq: "=",
  neq: "≠",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  in: "in",
  not_in: "not in",
};

function describe(condition: RiskRuleConditionOutput): string {
  const label = RULE_FIELDS[condition.field].label;
  const value = Array.isArray(condition.value)
    ? condition.value.join(", ")
    : String(condition.value);
  if (condition.operator === "is") return condition.value ? label : `not: ${label}`;
  return `${label} ${OPERATOR_TEXT[condition.operator]} ${value}`;
}

export default async function RiskRulesPage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/risk/rules">) {
  const { orgSlug, projectSlug, envSlug } = await params;
  const { organization, can } = await requireOrgMember(orgSlug);
  if (!can({ riskRule: ["read"] })) notFound();
  const found = await getEnvironment({ organizationId: organization.id, projectSlug, envSlug });
  if (!found) notFound();
  const { project, environment } = found;
  const rules = await listRiskRules({
    organizationId: organization.id,
    environmentId: environment.id,
  });
  const riskPath = `/${organization.slug}/projects/${project.slug}/${environment.slug}/risk`;
  const target = {
    orgSlug: organization.slug,
    projectSlug: project.slug,
    envSlug: environment.slug,
  };
  const canUpdate = can({ riskRule: ["update"] });
  const canDelete = can({ riskRule: ["delete"] });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href={riskPath}>
          ← Risk
        </Link>
        <PageHeader
          actions={
            can({ riskRule: ["create"] }) ? <RuleDialog {...target} trigger="create" /> : null
          }
          description="Checked after the allow and block lists, in position order: the first enabled rule whose conditions match an event decides it."
          title={
            <span className="flex items-center gap-2">
              Risk rules <ModeBadge mode={environment.mode} />
            </span>
          }
        />
      </div>

      <Card>
        <CardPanel className="p-2">
          {rules.data.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">
              No rules yet. Decisions come from the lists and the score.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-0">#</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Then</TableHead>
                  {canUpdate || canDelete ? <TableHead className="w-0" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.data.map((rule) => (
                  <TableRow className={rule.enabled ? undefined : "opacity-60"} key={rule.id}>
                    <TableCell className="tabular-nums">{rule.position}</TableCell>
                    <TableCell>
                      <span className="flex flex-col gap-1">
                        <span className="flex items-center gap-2 font-medium">
                          {rule.name}
                          {rule.enabled ? null : <Badge variant="outline">disabled</Badge>}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {rule.events.length > 0 ? rule.events.join(", ") : "every event"}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md text-sm">
                      {rule.conditions.map(describe).join(rule.match === "all" ? " and " : " or ")}
                    </TableCell>
                    <TableCell>
                      <RiskDecisionBadge decision={rule.action} />
                    </TableCell>
                    {canUpdate || canDelete ? (
                      <TableCell>
                        <span className="flex gap-2">
                          {canUpdate ? (
                            <>
                              <RuleDialog {...target} rule={rule} trigger="edit" />
                              <ToggleRuleButton
                                {...target}
                                enabled={rule.enabled}
                                ruleId={rule.id}
                              />
                            </>
                          ) : null}
                          {canDelete ? (
                            <DeleteRuleButton {...target} name={rule.name} ruleId={rule.id} />
                          ) : null}
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
    </div>
  );
}
