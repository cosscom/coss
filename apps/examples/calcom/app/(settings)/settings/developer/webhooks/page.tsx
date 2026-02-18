import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { WebhooksEmpty } from "./webhooks-empty";

export default function WebhooksSettingsPage() {
  const webhooks: { id: string; url: string; events: string }[] = [];

  return (
    <CardFrame>
      <CardFrameHeader>
        <CardFrameTitle>Webhooks</CardFrameTitle>
        <CardFrameDescription>
          Receive meeting data in real-time when something happens in Cal.com.
        </CardFrameDescription>
      </CardFrameHeader>

      <Card>
        <CardPanel className="p-0">
          <WebhooksEmpty webhooks={webhooks} />
        </CardPanel>
      </Card>
    </CardFrame>
  );
}
