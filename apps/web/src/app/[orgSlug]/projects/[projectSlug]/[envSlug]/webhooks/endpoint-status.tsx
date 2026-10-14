import { Badge } from "@coss/ui/components/badge";
import type { WebhookEndpointRow } from "@coss/webhooks";

export function EndpointStatusBadge({
  endpoint,
}: {
  endpoint: Pick<WebhookEndpointRow, "enabled" | "disabledReason" | "failingSince">;
}) {
  if (endpoint.enabled) {
    return endpoint.failingSince ? (
      <Badge variant="warning">Failing</Badge>
    ) : (
      <Badge variant="success">Enabled</Badge>
    );
  }
  if (endpoint.disabledReason === "failing") {
    return <Badge variant="error">Disabled: failing</Badge>;
  }
  return <Badge variant="secondary">Disabled</Badge>;
}
