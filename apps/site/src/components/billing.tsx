import { type MeterKey, PLAN_KEYS, PLANS, type Product } from "@coss/billing/catalog";
import { addOnRows, planRows, rateRows } from "@/lib/billing-text";
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

/** The list usage rates per product (or of one `product`'s meters, or of `meters`: comma-separated). */
export function UsageRates({ product, meters }: { product?: Product; meters?: string }) {
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
        {rateRows(meters ? (meters.split(",") as MeterKey[]) : product).map((row) => (
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

/** The add-ons sold on top of a plan. */
export function AddOns() {
  return (
    <DocsTable>
      <thead>
        <DocsTr>
          <DocsTh>Add-on</DocsTh>
          <DocsTh>Price</DocsTh>
          <DocsTh>Plans</DocsTh>
          <DocsTh />
        </DocsTr>
      </thead>
      <tbody>
        {addOnRows().map((row) => (
          <DocsTr key={row.name}>
            <DocsTd>{row.name}</DocsTd>
            <DocsTd>{row.price}</DocsTd>
            <DocsTd>{row.plans}</DocsTd>
            <DocsTd>{row.description}</DocsTd>
          </DocsTr>
        ))}
      </tbody>
    </DocsTable>
  );
}
