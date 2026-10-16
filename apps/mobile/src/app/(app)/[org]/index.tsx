import type { BillingAlerts, OrganizationResponse } from "@coss/companion";
import { type Href, router, useLocalSearchParams } from "expo-router";
import { CreditCard, Folder, FolderPlus, Gauge, Globe, History, Users } from "lucide-react-native";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Alert } from "../../../components/alert";
import { Badge, StatusDot } from "../../../components/badge";
import { EmptyState } from "../../../components/empty";
import { Icon } from "../../../components/icon";
import { ListRow, Panel, Ruled } from "../../../components/panel";
import { ErrorState, Loading, PageIntro, Screen } from "../../../components/screen";
import { Text } from "../../../components/text";
import { formatCount, roleLabel } from "../../../lib/format";
import { rememberOrganization } from "../../../lib/last-org";
import { useOrganization } from "../../../lib/queries";
import { STANDING_LABELS, standingTone } from "../../../lib/status";
import { colors, radius } from "../../../lib/theme";
import { openOnWeb } from "../../../lib/web";

// apps/web/src/components/billing/billing-banner.tsx
const HOLD_MESSAGES: Record<NonNullable<BillingAlerts["held"]>, string> = {
  delinquent: "An invoice is overdue. Sending resumes as soon as it is paid.",
  spend_limit:
    "This month's usage reached your spend limit. Raise it, or sending resumes next month.",
  admin: "coss.com paused live sending for billing reasons. Contact support.",
};

function Alerts({ data }: { data: OrganizationResponse }) {
  const { organization, standing, billing } = data;
  const openReputation = () =>
    router.push({ pathname: "/[org]/reputation", params: { org: organization.slug } });
  const openBilling = () => openOnWeb(`/${organization.slug}/settings/billing`);
  const alerts = [];
  if (organization.suspended) {
    alerts.push(
      <Alert
        description="A coss.com administrator suspended this organization, so the dashboard is read-only."
        key="suspended"
        title="This organization is suspended"
        tone="error"
      />,
    );
  }
  if (standing.status === "suspended") {
    alerts.push(
      <Alert
        description={`coss.com suspended live sending for this organization (${standing.reason_label?.toLowerCase() ?? "reputation"}). Sandbox keys still work. Contact support to resume sending.`}
        action={{ label: "View reputation", onPress: openReputation }}
        key="standing"
        title="Live sending is suspended"
        tone="error"
      />,
    );
  } else if (standing.status === "warning") {
    alerts.push(
      <Alert
        description={`${standing.reason_label ?? "A reputation check"} is approaching the level at which coss.com suspends live sending automatically.`}
        action={{ label: "View reputation", onPress: openReputation }}
        key="standing"
        title="Your sending reputation needs attention"
        tone="warning"
      />,
    );
  }
  if (billing?.held) {
    alerts.push(
      <Alert
        action={{ label: "Open billing", onPress: openBilling }}
        description={`${HOLD_MESSAGES[billing.held]} Sandbox keys still work.`}
        key="hold"
        title="Live sending is paused"
        tone="error"
      />,
    );
  } else if (billing?.past_due) {
    alerts.push(
      <Alert
        action={{ label: "Open billing", onPress: openBilling }}
        description="An invoice is past due. Pay it to keep sending."
        key="past-due"
        tone="warning"
      />,
    );
  } else if (billing?.allowance) {
    const { label, used, cap } = billing.allowance;
    const full = used >= cap;
    alerts.push(
      <Alert
        action={{
          label: "Upgrade",
          onPress: () => openOnWeb(`/${organization.slug}/settings/billing/plans`),
        }}
        description={
          full
            ? `You've used all ${formatCount(cap)} ${label} included this month: live sends are refused until next month.`
            : `You've used ${formatCount(used)} of the ${formatCount(cap)} ${label} included this month.`
        }
        key="allowance"
        tone={full ? "error" : "warning"}
      />,
    );
  }
  return alerts;
}

export default function OrganizationScreen() {
  const { org } = useLocalSearchParams<{ org: string }>();
  const query = useOrganization(org);
  useEffect(() => {
    if (query.data) rememberOrganization(query.data.organization.slug);
  }, [query.data]);
  return (
    <>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <Screen
          onRefresh={() => query.refetch()}
          refreshing={query.isRefetching}
          title={query.data.organization.name}
        >
          <PageIntro
            title={query.data.organization.name}
            description="Each project has a production (live) and a development (sandbox) environment, each with its own API keys, emails, logs and webhooks."
            meta={
              <>
                <Badge variant="outline">{roleLabel(query.data.organization.role)}</Badge>
                {query.data.organization.suspended ? (
                  <Badge variant="error">Suspended</Badge>
                ) : null}
                <Text muted variant="mono">
                  {query.data.organization.slug}
                </Text>
              </>
            }
          />
          <Alerts data={query.data} />
          {query.data.can.read_reputation ? (
            <Panel>
              <ListRow
                href={{ pathname: "/[org]/reputation", params: { org } }}
                leading={
                  <View style={styles.tile}>
                    <Icon icon={Gauge} />
                  </View>
                }
                subtitle="Bounce and complaint rates"
                title="Reputation"
                trailing={
                  <Badge variant="outline">
                    <StatusDot
                      label={STANDING_LABELS[query.data.standing.status]}
                      tone={standingTone(query.data.standing.status)}
                    />
                  </Badge>
                }
              />
            </Panel>
          ) : null}
          {query.data.projects.length === 0 ? (
            <Panel>
              <EmptyState
                description="Projects you create on coss.com appear here."
                icon={FolderPlus}
                title="No projects yet"
              />
            </Panel>
          ) : (
            query.data.projects.map((project) => (
              <Panel
                description={project.slug}
                descriptionMono
                icon={Folder}
                key={project.id}
                title={project.name}
              >
                <Ruled>
                  {project.environments.map((environment) => (
                    <ListRow
                      detail={environment.mode}
                      href={{
                        pathname: "/[org]/projects/[project]/[env]",
                        params: { org, project: project.slug, env: environment.slug },
                      }}
                      key={environment.id}
                      leading={
                        <StatusDot tone={environment.mode === "live" ? "success" : "info"} />
                      }
                      title={environment.name}
                    />
                  ))}
                </Ruled>
              </Panel>
            ))
          )}
          <Panel title="Organization">
            <Ruled>
              {[
                query.data.can.read_domain && { label: "Domains", path: "domains", icon: Globe },
                { label: "Members", path: "members", icon: Users },
                query.data.can.read_billing && {
                  label: "Billing",
                  path: "settings/billing",
                  icon: CreditCard,
                },
                query.data.can.read_audit && {
                  label: "Audit log",
                  path: "settings/audit",
                  icon: History,
                },
              ]
                .filter((item) => item !== false)
                .map((item) => (
                  <ListRow
                    href={`/${org}/${item.path}` as Href}
                    key={item.path}
                    leading={<Icon color="mutedForeground" icon={item.icon} size={18} />}
                    title={item.label}
                  />
                ))}
            </Ruled>
          </Panel>
        </Screen>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
});
