import { Badge } from "@coss/ui/components/badge";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import { rateTables } from "@/lib/pricing";

/** The list usage rates, one card per product (from the current rate card). */
export function UsageRateCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {rateTables().map((table) => (
        <Card key={`${table.meter}:${table.scope ?? ""}`}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {table.product}
              {!table.available && <Badge variant="outline">Soon</Badge>}
            </CardTitle>
            <CardDescription>
              {table.scope ? `${table.scope}, ${table.per}` : table.per}
            </CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-col gap-3">
            <dl className="flex flex-col gap-1.5 text-sm">
              {table.bands.map((band) => (
                <div className="flex justify-between gap-4" key={band.range}>
                  <dt className="text-muted-foreground">{band.range}</dt>
                  <dd className="font-medium tabular-nums">{band.price}</dd>
                </div>
              ))}
            </dl>
            {table.note && <p className="text-muted-foreground text-xs">{table.note}</p>}
          </CardPanel>
        </Card>
      ))}
    </div>
  );
}
