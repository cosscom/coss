import { formatRetentionPeriod, RETENTION_POLICY } from "@coss/retention";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";

/** The published retention policy (`@coss/retention`, enforced by the worker), read-only. */
export function RetentionPolicyCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Data retention</CardTitle>
        <CardDescription>
          How long COSS keeps this organization's data. It is the same for every organization and
          deleted automatically once its period ends.{" "}
          {/* The site's zone: a plain link, not next/link. */}
          <a className="text-foreground underline" href="/docs/data-retention">
            Read the retention policy
          </a>
          .
        </CardDescription>
      </CardHeader>
      <CardPanel className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Kept</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {RETENTION_POLICY.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>
                  <div className="font-medium">{rule.label}</div>
                  <div className="whitespace-normal text-muted-foreground text-xs">
                    {rule.description}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap align-top">
                  {formatRetentionPeriod(rule.period)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardPanel>
    </Card>
  );
}
