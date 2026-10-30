import { apiRateLimitRows } from "../lib/rate-limits-text";
import { DocsTable, DocsTd, DocsTh, DocsTr } from "./docs-table";

/** Inline code for the `covers` text's backticked names. */
function withCode(text: string) {
  return text.split(/(`[^`]+`)/).map((part, index) =>
    part.startsWith("`") ? (
      <code
        className="rounded-md bg-muted px-[0.3rem] py-[0.2rem] font-mono text-[.8125rem] text-muted-foreground"
        // biome-ignore lint/suspicious/noArrayIndexKey: a fixed split of a constant string
        key={index}
      >
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}

/** The public API's rate limit buckets (from `@coss/ratelimit/buckets`, which the API enforces). */
export function ApiRateLimits() {
  return (
    <DocsTable>
      <thead>
        <DocsTr>
          <DocsTh>Bucket</DocsTh>
          <DocsTh>Covers</DocsTh>
          <DocsTh>Counted per</DocsTh>
          <DocsTh>Rate</DocsTh>
          <DocsTh>Burst</DocsTh>
        </DocsTr>
      </thead>
      <tbody>
        {apiRateLimitRows().map((row) => (
          <DocsTr key={row.bucket} id={`rate-limit-${row.bucket.replaceAll(".", "-")}`}>
            <DocsTd className="whitespace-nowrap">{withCode(`\`${row.bucket}\``)}</DocsTd>
            <DocsTd>{withCode(row.covers)}</DocsTd>
            <DocsTd className="whitespace-nowrap">{row.per}</DocsTd>
            <DocsTd className="whitespace-nowrap">{row.rate}</DocsTd>
            <DocsTd>{row.burst}</DocsTd>
          </DocsTr>
        ))}
      </tbody>
    </DocsTable>
  );
}
