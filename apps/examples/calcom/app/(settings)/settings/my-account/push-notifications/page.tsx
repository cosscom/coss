"use client";

import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { BellIcon, BellOffIcon } from "lucide-react";
import { useState } from "react";

export default function PushNotificationsPage() {
  const [isSubscribed, setIsSubscribed] = useState(false);

  return (
    <div className="space-y-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Push notifications</CardFrameTitle>
          <CardFrameDescription>
            Receive push notifications when booker submits instant meeting
            booking.
          </CardFrameDescription>
        </CardFrameHeader>

        <Card className="rounded-t-none!">
          <CardPanel>
            <Button
              onClick={() => setIsSubscribed((prev) => !prev)}
              variant={isSubscribed ? "outline" : "default"}
            >
              {isSubscribed ? <BellOffIcon /> : <BellIcon />}
              {isSubscribed
                ? "Disable browser notifications"
                : "Allow browser notifications"}
            </Button>
          </CardPanel>
        </Card>
      </CardFrame>
    </div>
  );
}
