import { PLAN_KEYS, PLANS } from "@coss/billing/catalog";
import { planRows, rateRows } from "@/lib/billing-text";
import { DocsTable, DocsTd, DocsTh, DocsTr } from "./docs-table";

/** The plans side by side (from `@coss/billing/catalog`, which billing enforces). */
export function PlanTable() {
  return (
    <DocsTable>
      <thead>
        <DocsTr>
          <DocsTh />
          {PLAN_KEYS.map((key) => (
            <DocsTh key={key}>{PLANS[key].name}</DocsTh>
          ))}
        </DocsTr>
      </thead>
      <tbody>
        {planRows().map((row) => (
          <DocsTr key={row.label}>
            <DocsTd>{row.label}</DocsTd>
            {row.values.map((value, index) => (
              <DocsTd key={PLAN_KEYS[index]}>{value}</DocsTd>
            ))}
          </DocsTr>
        ))}
      </tbody>
    </DocsTable>
  );
}

/** The list usage rates per product. */
export function UsageRates() {
  return (
    <DocsTable>
      <thead>
        <DocsTr>
          <DocsTh>Product</DocsTh>
          <DocsTh>Rate</DocsTh>
          <DocsTh />
        </DocsTr>
      </thead>
      <tbody>
        {rateRows().map((row) => (
          <DocsTr key={row.product}>
            <DocsTd>{row.product}</DocsTd>
            <DocsTd>{row.rate}</DocsTd>
            <DocsTd>{row.note}</DocsTd>
          </DocsTr>
        ))}
      </tbody>
    </DocsTable>
  );
}
