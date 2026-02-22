import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

export default function BillingPage() {
  return (
    <div className="flex flex-col gap-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Billing</CardFrameTitle>
          <CardFrameDescription>Manage all things billing</CardFrameDescription>
        </CardFrameHeader>
        <Card className="rounded-b-none!">
          <CardPanel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardFrameTitle>Manage billing</CardFrameTitle>
                <CardFrameDescription>
                  View and manage your billing details
                </CardFrameDescription>
              </div>
              <Button>
                Billing portal
                <ExternalLinkIcon aria-hidden="true" />
              </Button>
            </div>
          </CardPanel>
        </Card>
      </CardFrame>

      <div className="my-2 text-center text-muted-foreground/72 text-sm">
        Need help?{" "}
        <Link
          className="text-muted-foreground underline hover:text-foreground"
          href="#"
        >
          Contact support
        </Link>
      </div>
    </div>
  );
}
