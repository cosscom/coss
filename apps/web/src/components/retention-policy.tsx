import { formatRetentionPeriod, RETENTION_POLICY } from "@coss/retention";
import { Button } from "@coss/ui/components/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@coss/ui/components/collapsible";
import { ChevronDownIcon } from "lucide-react";
import { SettingsRow, SettingsSection } from "./settings";

/**
 * The published retention policy (`@coss/retention`, enforced by the worker), read-only: one row,
 * with every period folded under it.
 */
export function RetentionPolicySection() {
  return (
    <SettingsSection
      description="The same for every organization. Data is deleted automatically once its period ends."
      title="Data retention"
    >
      <Collapsible>
        <SettingsRow
          description={
            <>
              {RETENTION_POLICY.length} kinds of data, each with its own period.{" "}
              {/* The site's zone: a plain link, not next/link. */}
              <a
                className="text-foreground underline underline-offset-4"
                href="/docs/data-retention"
              >
                Read the policy
              </a>
            </>
          }
          label="Retention periods"
        >
          <CollapsibleTrigger className="group" render={<Button size="sm" variant="outline" />}>
            <span className="group-data-panel-open:hidden">Show periods</span>
            <span className="hidden group-data-panel-open:inline">Hide periods</span>
            <ChevronDownIcon className="transition-transform duration-200 group-data-panel-open:rotate-180" />
          </CollapsibleTrigger>
        </SettingsRow>
        <CollapsiblePanel>
          <dl className="border-t">
            {RETENTION_POLICY.map((rule) => (
              <div
                className="flex items-baseline justify-between gap-6 border-t px-5 py-3 first:border-t-0"
                key={rule.id}
              >
                <dt className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium text-sm">{rule.label}</span>
                  <span className="text-pretty text-muted-foreground text-xs leading-normal">
                    {rule.description}
                  </span>
                </dt>
                <dd className="shrink-0 text-right font-mono text-muted-foreground text-xs">
                  {formatRetentionPeriod(rule.period)}
                </dd>
              </div>
            ))}
          </dl>
        </CollapsiblePanel>
      </Collapsible>
    </SettingsSection>
  );
}
