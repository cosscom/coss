import { useEnvironment } from "../lib/queries";
import type { EnvironmentParams } from "../lib/web";
import { Badge, StatusDot } from "./badge";

/** The dashboard's ModeBadge for the environment in the URL. */
export function ModeBadge({ params }: { params: EnvironmentParams }) {
  const mode = useEnvironment(params).data?.environment.mode;
  if (!mode) return null;
  return (
    <Badge variant="outline">
      <StatusDot
        label={mode === "live" ? "Live" : "Sandbox"}
        tone={mode === "live" ? "success" : "info"}
      />
    </Badge>
  );
}
