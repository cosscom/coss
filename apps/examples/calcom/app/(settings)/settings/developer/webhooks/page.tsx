import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { WebhooksListContent } from "./webhooks-list-content";

export default function WebhooksSettingsPage() {
  const webhooks: { id: string; url: string; events: string }[] = [];

  return (
    <div className="space-y-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Webhooks</CardFrameTitle>
          <CardFrameDescription>
            Receive meeting data in real-time when something happens in Cal.com.
          </CardFrameDescription>
        </CardFrameHeader>

        <Card className="rounded-b-none!">
          <CardPanel>
            <WebhooksListContent webhooks={webhooks} />
          </CardPanel>
        </Card>
      </CardFrame>
    </div>
  );
}
