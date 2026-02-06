import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameFooter,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { ActivityIcon, ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { NewWebhookFormFields } from "./new-webhook-form-fields";
import { WebhookTestSection } from "./webhook-test-section";

export default function NewWebhookPage() {
  return (
    <div className="flex flex-col gap-4">
      <CardFrame>
        <CardFrameHeader>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <Button
                aria-label="Back to webhooks"
                render={<Link href="/settings/developer/webhooks" />}
                size="icon-sm"
                variant="ghost"
              >
                <ArrowLeftIcon />
              </Button>
              <div>
                <CardFrameTitle>New webhook</CardFrameTitle>
                <CardFrameDescription>
                  Receive meeting data in real-time when something happens in
                  Cal.com.
                </CardFrameDescription>
              </div>
            </div>
          </div>
        </CardFrameHeader>

        <Card className="rounded-b-none!">
          <CardPanel>
            <NewWebhookFormFields />
          </CardPanel>
        </Card>
        <CardFrameFooter className="flex justify-end gap-2">
          <Button
            render={<Link href="/settings/developer/webhooks" />}
            variant="outline"
          >
            Cancel
          </Button>
          <Button>Save</Button>
        </CardFrameFooter>
      </CardFrame>

      <CardFrame>
        <CardFrameHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardFrameTitle>Webhook test</CardFrameTitle>
              <CardFrameDescription>
                Please ping test before creating.
              </CardFrameDescription>
            </div>
            <Button size="sm" variant="outline">
              <ActivityIcon />
              Ping test
            </Button>
          </div>
        </CardFrameHeader>
        <Card>
          <CardPanel>
            <WebhookTestSection />
          </CardPanel>
        </Card>
      </CardFrame>
    </div>
  );
}
