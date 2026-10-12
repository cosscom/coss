import { PLAN_KEYS, PLANS } from "@coss/billing/catalog";
import { planRows, rateRows } from "@/lib/billing-text";

/** The plans side by side (from `@coss/billing/catalog`, which billing enforces). */
export function PlanTable() {
  return (
    <table>
      <thead>
        <tr>
          <th />
          {PLAN_KEYS.map((key) => (
            <th key={key}>{PLANS[key].name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {planRows().map((row) => (
          <tr key={row.label}>
            <td>{row.label}</td>
            {row.values.map((value, index) => (
              <td key={PLAN_KEYS[index]}>{value}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The list usage rates per product. */
export function UsageRates() {
  return (
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Rate</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {rateRows().map((row) => (
          <tr key={row.product}>
            <td>{row.product}</td>
            <td>{row.rate}</td>
            <td>{row.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
