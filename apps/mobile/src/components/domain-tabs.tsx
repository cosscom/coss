import { router } from "expo-router";
import { Tabs } from "./tabs";

type DomainTab = "overview" | "dmarc";

// The dashboard's domain tabs (`DOMAIN_NAV` in apps/web/src/lib/navigation.ts).
const ITEMS: { value: DomainTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "dmarc", label: "DMARC" },
];

/** Overview / DMARC: switching replaces the screen, so Back still returns to the domains list. */
export function DomainTabs(props: { org: string; domainId: string; value: DomainTab }) {
  return (
    <Tabs
      items={ITEMS}
      onChange={(value) => {
        if (value === props.value) return;
        router.replace({
          pathname:
            value === "dmarc" ? "/[org]/domains/[domainId]/dmarc" : "/[org]/domains/[domainId]",
          params: { org: props.org, domainId: props.domainId },
        });
      }}
      value={props.value}
    />
  );
}
