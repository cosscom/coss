import { reputationThresholdRows, reputationWindowText } from "../lib/reputation-text";
import { DocsTable, DocsTd, DocsTh, DocsTr } from "./docs-table";

/** The reputation guard's default thresholds (from `@coss/reputation/schemas`). */
export function ReputationThresholds() {
  return (
    <DocsTable>
      <thead>
        <DocsTr>
          <DocsTh>Signal</DocsTh>
          <DocsTh>Warning at</DocsTh>
          <DocsTh>Then</DocsTh>
          <DocsTh>Minimum volume</DocsTh>
        </DocsTr>
      </thead>
      <tbody>
        {reputationThresholdRows().map((row) => (
          <DocsTr key={row.id} id={`reputation-${row.id}`}>
            <DocsTd>{row.signal}</DocsTd>
            <DocsTd className="whitespace-nowrap">{row.warning}</DocsTd>
            <DocsTd>{row.action}</DocsTd>
            <DocsTd className="whitespace-nowrap">{row.minimum}</DocsTd>
          </DocsTr>
        ))}
      </tbody>
    </DocsTable>
  );
}

/** The rolling window reputation rates are measured over, in running text ("7 days"). */
export function ReputationWindow() {
  return <>{reputationWindowText()}</>;
}
