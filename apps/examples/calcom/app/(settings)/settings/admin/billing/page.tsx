"use client";

import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Group } from "@coss/ui/components/group";
import { Input } from "@coss/ui/components/input";
import {
  Sheet,
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@coss/ui/components/sheet";
import { ExternalLinkIcon } from "lucide-react";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

export default function AdminBillingPage() {
  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Admin billing">
          <AppHeaderDescription>
            Manage billing emails and Stripe portal access for licenses.
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <div className="flex flex-col gap-4">
        <CardFrame>
          <CardFrameHeader>
            <CardFrameTitle>Self-hosted deployment lookup</CardFrameTitle>
          </CardFrameHeader>
          <Card>
            <CardPanel>
              <Field>
                <FieldLabel>Billing email</FieldLabel>
                <Group aria-label="User impersonation" className="w-full gap-2">
                  <Input placeholder="customer@example.com" type="email" />
                  <div>
                    <Sheet>
                      <SheetTrigger render={<Button />}>Search</SheetTrigger>
                      <SheetPopup variant="inset">
                        <SheetHeader>
                          <SheetTitle>Deployment details</SheetTitle>
                          <SheetDescription>a@gmail.com</SheetDescription>
                        </SheetHeader>
                        <SheetPanel className="flex flex-col gap-6">
                          <div className="flex flex-col gap-2">
                            <h3 className="font-semibold text-sm">
                              Billing details
                            </h3>
                            <dl className="flex flex-col gap-2 rounded-xl border p-4 text-xs">
                              <div className="flex justify-between gap-4">
                                <dt className="text-muted-foreground">
                                  Billing email
                                </dt>
                                <dd className="font-medium">a@gmail.com</dd>
                              </div>
                              <div className="flex justify-between gap-4">
                                <dt className="text-muted-foreground">
                                  Customer ID
                                </dt>
                                <dd className="font-medium">
                                  cus_mock123456789
                                </dd>
                              </div>
                              <div className="flex justify-between gap-4">
                                <dt className="text-muted-foreground">
                                  Created
                                </dt>
                                <dd className="font-medium">1/15/2024</dd>
                              </div>
                              <div className="flex justify-between gap-4">
                                <dt className="text-muted-foreground">
                                  Last updated
                                </dt>
                                <dd className="font-medium">3/1/2024</dd>
                              </div>
                            </dl>
                          </div>

                          <div className="flex flex-col gap-2">
                            <h3 className="font-semibold text-sm">
                              License keys (2)
                            </h3>
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col gap-4 rounded-xl border p-4 text-xs">
                                <dl className="flex flex-col gap-2">
                                  <div className="flex justify-between gap-4">
                                    <dd className="font-medium font-mono">
                                      cal_live...xxxxxxxx
                                    </dd>
                                    <dd className="flex items-center gap-2">
                                      <Badge variant="success">active</Badge>
                                      <Badge variant="info">SELF_HOSTED</Badge>
                                    </dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-muted-foreground">
                                      Subscription ID
                                    </dt>
                                    <dd className="font-medium">
                                      sub_mock123456789
                                    </dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-muted-foreground">
                                      Billing type
                                    </dt>
                                    <dd className="font-medium">PER_USER</dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-muted-foreground">
                                      Entity count
                                    </dt>
                                    <dd className="font-medium">10</dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-muted-foreground">
                                      Entity price
                                    </dt>
                                    <dd className="font-medium">$5.00</dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-muted-foreground">
                                      Overages
                                    </dt>
                                    <dd className="font-medium">0</dd>
                                  </div>
                                </dl>
                                <div>
                                  <h4 className="mb-2 font-semibold text-sm">
                                    Recent usage (last 30 days)
                                  </h4>
                                  <dl className="flex flex-col gap-1">
                                    <div className="flex justify-between">
                                      <dt className="text-muted-foreground">
                                        2/1/2024
                                      </dt>
                                      <dd>42</dd>
                                    </div>
                                    <div className="flex justify-between">
                                      <dt className="text-muted-foreground">
                                        2/15/2024
                                      </dt>
                                      <dd>38</dd>
                                    </div>
                                    <div className="flex justify-between">
                                      <dt className="text-muted-foreground">
                                        3/1/2024
                                      </dt>
                                      <dd>55</dd>
                                    </div>
                                  </dl>
                                </div>
                              </div>

                              <div className="flex flex-col gap-4 rounded-xl border p-4 text-xs">
                                <dl className="flex flex-col gap-2">
                                  <div className="flex justify-between gap-4">
                                    <dd className="font-medium font-mono">
                                      cal_live...yyyyyyyy
                                    </dd>
                                    <dd className="flex items-center gap-2">
                                      <Badge variant="secondary">
                                        Inactive
                                      </Badge>
                                      <Badge variant="info">SELF_HOSTED</Badge>
                                    </dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-muted-foreground">
                                      Subscription ID
                                    </dt>
                                    <dd className="font-medium">Not set</dd>
                                  </div>
                                </dl>
                              </div>
                            </div>
                          </div>
                        </SheetPanel>
                        <SheetFooter>
                          <SheetClose render={<Button variant="ghost" />}>
                            Close
                          </SheetClose>
                          <Button variant="outline">Edit billing</Button>
                          <Button variant="outline">Resend email</Button>
                        </SheetFooter>
                      </SheetPopup>
                    </Sheet>
                  </div>
                </Group>
                <FieldDescription>
                  Search for a self-hosted deployment by billing email to view
                  and manage its details.
                </FieldDescription>
              </Field>
            </CardPanel>
          </Card>
        </CardFrame>
        <CardFrame>
          <CardFrameHeader>
            <CardFrameTitle>Resend purchase confirmation</CardFrameTitle>
          </CardFrameHeader>
          <Card>
            <CardPanel>
              <Field>
                <FieldLabel>Billing email</FieldLabel>
                <Group aria-label="User impersonation" className="w-full gap-2">
                  <Input placeholder="customer@example.com" type="email" />
                  <div>
                    <Button>Resend email</Button>
                  </div>
                </Group>
                <FieldDescription>
                  Send the purchase confirmation email to a billing address.
                </FieldDescription>
              </Field>
            </CardPanel>
          </Card>
        </CardFrame>
        <CardFrame>
          <CardFrameHeader>
            <CardFrameTitle>Billing portal</CardFrameTitle>
          </CardFrameHeader>
          <Card>
            <CardPanel>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardFrameDescription>
                    Open the Stripe billing portal for this license.
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
      </div>
    </>
  );
}
