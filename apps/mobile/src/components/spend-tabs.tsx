import { router } from "expo-router";
import { Tabs } from "./tabs";

type SpendTab = "overview" | "budgets";

// The dashboard's spend tabs (`SPEND_NAV` in apps/web/src/lib/navigation.ts).
const ITEMS: { value: SpendTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "budgets", label: "Budgets" },
];

/** Overview / Budgets: switching replaces the screen, so Back still returns to the organization. */
export function SpendTabs(props: { org: string; value: SpendTab }) {
  return (
    <Tabs
      items={ITEMS}
      onChange={(value) => {
        if (value === props.value) return;
        router.replace({
          pathname: value === "budgets" ? "/[org]/spend/budgets" : "/[org]/spend",
          params: { org: props.org },
        });
      }}
      value={props.value}
    />
  );
}
