import { Label } from "@coss/ui/components/label";

export function WebhookTestSection() {
  return (
    <div className="flex flex-col gap-2">
      <Label render={<div />}>Webhook response</Label>
      <div className="rounded-lg border border-input">
        <div className="p-4 font-mono text-sm">No data yet</div>
      </div>
    </div>
  );
}
