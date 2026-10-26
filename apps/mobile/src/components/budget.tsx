import type { SpendBudget } from "@coss/companion";
import { StyleSheet, View } from "react-native";
import { formatMoney } from "../lib/format";
import { budgetFraction, overBudget } from "../lib/status-spend";
import { colors } from "../lib/theme";
import { Text } from "./text";

/**
 * Spent against the budget that applies, as a bar (red once over it): the dashboard's
 * `BudgetCell` (apps/web/src/components/billing/budget-cell.tsx).
 */
export function BudgetMeter({ budget }: { budget: SpendBudget }) {
  if (budget.amount === null) {
    return (
      <Text muted variant="mono">
        {budget.spent > 0 ? `${formatMoney(budget.spent)} · ` : null}
        {budget.applies ? "exempt" : "no budget"}
      </Text>
    );
  }
  const fraction = budgetFraction(budget) ?? 0;
  return (
    <View style={styles.meter}>
      <Text variant="mono">
        {formatMoney(budget.spent)} of {formatMoney(budget.amount)}
        {budget.from_default ? (
          <Text muted variant="mono">
            {" "}
            (default)
          </Text>
        ) : null}
      </Text>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${fraction * 100}%`,
              backgroundColor: overBudget(budget) ? colors.destructive : colors.foreground,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  meter: { gap: 6 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.muted, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
});
