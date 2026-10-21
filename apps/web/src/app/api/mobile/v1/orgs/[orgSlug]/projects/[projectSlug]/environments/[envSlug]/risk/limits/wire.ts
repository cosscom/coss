import type { RiskLimitBucket } from "@coss/companion";
import type { RiskLimitBucketOutput } from "@coss/risk/schemas";

/** What the app's Rate limits screen shows of a bucket. */
export function toMobileRiskLimitBucket(bucket: RiskLimitBucketOutput): RiskLimitBucket {
  return {
    id: bucket.id,
    name: bucket.name,
    limit: bucket.limit,
    period_seconds: bucket.period_seconds,
    burst: bucket.burst,
    on_failure: bucket.on_failure,
  };
}
