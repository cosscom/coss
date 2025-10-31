import { PageHeader } from "@/components/page-header";
import { Button } from "@workspace/ui/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@workspace/ui/ui/card";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import {
  Rocket01Icon,
  GithubIcon,
  CalendarCheckInIcon,
  Alert02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export default async function Page() {
  return (
    <div
      data-slot="main-content"
      className="flex sm:text-[.9375rem] min-h-[calc(100svh-var(--header-height))] w-full"
    >
      <div className="flex-1 px-4 py-6 sm:px-6 lg:py-9">
        <div className="flex flex-col gap-6">
          {/* Page Header */}
          <PageHeader title="Platform">
            Manage everything related to platform.
          </PageHeader>

          {/* Cards */}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Card 1 */}
            <Card>
              <CardHeader>
                <HugeiconsIcon
                  icon={Rocket01Icon}
                  className="size-6 mb-3 text-muted-foreground"
                />
                <CardTitle>Try our Platform Starter Kit</CardTitle>
                <CardDescription>
                  If you are building a marketplace or platform from scratch,
                  our Platform Starter Kit has everything you need.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="outline">
                  Try the Demo
                  <ArrowRightIcon className="size-4" />
                </Button>
              </CardFooter>
            </Card>
            {/* Card 2 */}
            <Card>
              <CardHeader>
                <HugeiconsIcon
                  icon={GithubIcon}
                  className="size-6 mb-3 text-muted-foreground"
                />
                <CardTitle>Get the Source code</CardTitle>
                <CardDescription>
                  Our Platform Starter Kit is being used in production by
                  Cal.com itself. You can find the ready-to-rock source code on
                  GitHub.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="outline">
                  GitHub
                  <ArrowRightIcon className="size-4" />
                </Button>
              </CardFooter>
            </Card>
            {/* Card 3 */}
            <Card>
              <CardHeader>
                <HugeiconsIcon
                  icon={Alert02Icon}
                  className="size-6 mb-3 text-muted-foreground"
                />
                <CardTitle>Report issue</CardTitle>
                <CardDescription>
                  You can submit a ticket on GitHub or upgrade your plan to
                  receive real-time support with developer conferences
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="outline">
                  Open Issue
                  <ArrowRightIcon className="size-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* OAuth Clients */}
          <Card>
            <CardHeader>
              <CardTitle>OAuth Clients</CardTitle>
              <CardDescription>
                Connect your platform to cal.com with OAuth
              </CardDescription>
              <CardAction>
                <Button variant="outline">
                  <PlusIcon />
                  Add
                </Button>
              </CardAction>
            </CardHeader>
            <CardPanel>
              <ul className="space-y-2 text-sm">
                <li>
                  <span className="font-medium">Client name:</span> Url.cal.com
                </li>
                <li>
                  <span className="font-medium">Client Id:</span>{" "}
                  xxxxxxxxxxxxxxxxxx
                </li>
                <li>
                  <span className="font-medium">Client Secret:</span>{" "}
                  ••••••••••••••••••••
                </li>
                <li>
                  <span className="font-medium">Organization Id:</span> 11111
                </li>
                <li>
                  <span className="font-medium">Permissions:</span> read/write
                  event type, read/write booking, read/write schedule,
                  read/write apps, read/write profile
                </li>
                <li>
                  <span className="font-medium">Redirect uris:</span>{" "}
                  https://url.cal.com, http://localhost:3000
                </li>
                <li>
                  <span className="font-medium">Booking redirect uri:</span>{" "}
                  https://url.cal.com
                </li>
                <li>
                  <span className="font-medium">Emails enabled:</span> Yes
                </li>
                <li>
                  <span className="font-medium">
                    Default event types enabled:
                  </span>{" "}
                  Yes
                </li>
              </ul>
            </CardPanel>
            <CardFooter>
              <div className="w-full flex gap-2 justify-end">
                <Button>Webhooks</Button>
                <Button variant="outline">Edit</Button>
                <Button variant="destructive-outline">Delete</Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
