import { formatRetentionPeriod, RETENTION_POLICY } from "@coss/retention";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { Panel } from "./panel";

/** The published retention policy (`@coss/retention`, enforced by the worker), read-only. */
export function RetentionPolicyCard() {
  return (
    <Panel
      description={
        <>
          How long COSS keeps this organization's data. It is the same for every organization and
          deleted automatically once its period ends.{" "}
          {/* The site's zone: a plain link, not next/link. */}
          <a className="text-foreground underline underline-offset-4" href="/docs/data-retention">
            Read the retention policy
          </a>
          .
        </>
      }
      title="Data retention"
    >
      <Table variant="card">
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Kept</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {RETENTION_POLICY.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell className="whitespace-normal">
                <div className="font-medium">{rule.label}</div>
                <div className="text-muted-foreground text-xs leading-normal">
                  {rule.description}
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap text-right align-top font-mono text-xs">
                {formatRetentionPeriod(rule.period)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}
