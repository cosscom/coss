import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import type { WebhookItem } from "../webhooks-list-content";
import { WebhooksListContent } from "../webhooks-list-content";

const demoWebhooks: WebhookItem[] = [
  {
    date: "2021-10-20",
    enabled: true,
    events: [
      "Booking canceled",
      "Booking created",
      "Booking rejected",
      "Booking requested",
      "Booking payment initiated",
      "Booking rescheduled",
      "Booking paid",
      "Booking no-show updated",
      "Meeting ended",
      "Meeting started",
      "Recording download link ready",
      "Transcript generated",
      "Form submitted",
    ],
    id: "wh_1",
    url: "https://testurl.com/894357943857",
    userAvatar:
      "https://pbs.twimg.com/profile_images/1994776674391457792/7utKOMi6_400x400.jpg",
    userId: "user_1",
    userInitials: "JD",
    userName: "John Doe",
  },
  {
    date: "2024-01-15",
    enabled: true,
    events: ["Booking created", "Booking canceled"],
    id: "wh_2",
    url: "https://api.example.com/webhooks/booking-created",
    userAvatar:
      "https://pbs.twimg.com/profile_images/1994776674391457792/7utKOMi6_400x400.jpg",
    userId: "user_1",
    userInitials: "JD",
    userName: "John Doe",
  },
  {
    date: "2024-02-01",
    enabled: false,
    events: ["Meeting started", "Meeting ended"],
    id: "wh_3",
    url: "https://hooks.myapp.com/calcom",
    userId: "user_2",
    userInitials: "JS",
    userName: "Jane Smith",
  },
];

export default function WebhooksDemoPage() {
  return (
    <div className="space-y-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Webhooks</CardFrameTitle>
          <CardFrameDescription>
            Receive meeting data in real-time when something happens in Cal.com.
          </CardFrameDescription>
        </CardFrameHeader>

        <Card>
          <CardPanel className="p-0">
            <WebhooksListContent webhooks={demoWebhooks} />
          </CardPanel>
        </Card>
      </CardFrame>
    </div>
  );
}
