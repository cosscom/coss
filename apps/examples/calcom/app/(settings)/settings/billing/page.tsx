import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrameDescription,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

export default function BillingPage() {
  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Billing">
          <AppHeaderDescription>Manage all things billing</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <div className="flex flex-col gap-4">
        <Card>
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
    </>
  );
}
