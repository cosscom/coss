import type { PlanCell, PlansResponse } from "@coss/companion";
import { Stack, useLocalSearchParams } from "expo-router";
import { Check, Minus } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Badge, StatusDot } from "../../../../../components/badge";
import { Button } from "../../../../../components/button";
import { Icon } from "../../../../../components/icon";
import { SettingsRow } from "../../../../../components/organization-settings";
import { Panel, PanelBody, Ruled, SpecItem, SpecList } from "../../../../../components/panel";
import { ErrorState, Loading, PageIntro, Screen } from "../../../../../components/screen";
import { Segmented } from "../../../../../components/tabs";
import { Text } from "../../../../../components/text";
import { WebButton } from "../../../../../components/web-button";
import { usePlans } from "../../../../../lib/queries-organization-settings";
import { openOnWeb } from "../../../../../lib/web";

// Copy from the dashboard's plans page (apps/web/src/app/[orgSlug]/settings/billing/plans/page.tsx).
// Read-only: upgrading, switching and canceling stay on coss.com. "What each plan includes" is a
// table with a column per plan there; here one plan's column at a time.

type Plan = PlansResponse["plans"][number];

function PlanPanel({ plan }: { plan: Plan }) {
  return (
    <Panel
      action={
        plan.current ? (
          <Badge variant="outline">
            <StatusDot label="Current" tone="success" />
          </Badge>
        ) : null
      }
      description={plan.description}
      title={plan.name}
    >
      <PanelBody gap={10}>
        <Text variant="value">{plan.price}</Text>
        {plan.highlights.map((highlight) => (
          <View key={highlight} style={styles.highlight}>
            <View style={styles.check}>
              <Icon icon={Check} size={14} />
            </View>
            <Text style={styles.flex} variant="small">
              {highlight}
            </Text>
          </View>
        ))}
      </PanelBody>
    </Panel>
  );
}

function Cell({ cell }: { cell: PlanCell }) {
  if (cell === true) return <Icon icon={Check} size={16} />;
  if (cell === false) return <Icon color="mutedForeground" icon={Minus} size={16} />;
  return (
    <Text selectable variant={cell === "Add-on" ? "small" : "mono"}>
      {cell}
    </Text>
  );
}

function Includes({ plans }: { plans: PlansResponse }) {
  const current = plans.plans.findIndex((plan) => plan.current);
  const [selected, setSelected] = useState(plans.plans[Math.max(0, current)]?.key ?? "");
  const column = Math.max(
    0,
    plans.plans.findIndex((plan) => plan.key === selected),
  );
  return (
    <Panel title="What each plan includes">
      <PanelBody>
        <Segmented
          items={plans.plans.map((plan) => ({ value: plan.key, label: plan.name }))}
          onChange={setSelected}
          value={selected}
        />
      </PanelBody>
      <SpecList>
        {plans.includes.map((row) => {
          const cell = row.cells[column];
          return (
            <SpecItem key={row.label} label={row.label}>
              {cell === undefined ? "—" : <Cell cell={cell} />}
            </SpecItem>
          );
        })}
      </SpecList>
    </Panel>
  );
}

export default function PlansScreen() {
  const { org } = useLocalSearchParams<{ org: string }>();
  const query = usePlans(org);
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const plans = query.data;
  const path = `/${org}/settings/billing/plans`;
  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isRefetching} title="Plans">
      <Stack.Screen options={{ headerRight: () => <WebButton path={path} /> }} />
      <PageIntro
        description="Every plan's monthly fee is credit you can spend on any product's usage."
        title="Plans"
      />
      {plans.managed_note ? (
        <Text muted variant="small">
          {plans.managed_note}
        </Text>
      ) : null}
      {plans.plans.map((plan) => (
        <PlanPanel key={plan.key} plan={plan} />
      ))}
      {plans.can_manage && plans.managed_note === null ? (
        <Button onPress={() => openOnWeb(path)} title="Change plan on coss.com" variant="outline" />
      ) : null}
      <Includes plans={plans} />
      <Panel description="Charged on top of a plan. Add them on the billing page." title="Add-ons">
        <Ruled>
          {plans.add_ons.map((addOn) => (
            <SettingsRow description={addOn.description} key={addOn.name} label={addOn.name} />
          ))}
        </Ruled>
      </Panel>
      <Panel
        description="Billed monthly beyond your plan's credit. Volume tiers apply to each month's usage."
        title="Usage prices"
      >
        <Ruled>
          {plans.usage_prices.map((meter) => (
            <SettingsRow
              key={meter.label}
              label={meter.label}
              stacked={
                <Text muted selectable variant="mono">
                  {meter.rates.join("; ")}
                </Text>
              }
            />
          ))}
        </Ruled>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  highlight: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  check: { paddingTop: 2 },
});
