"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
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
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@coss/ui/components/input-group";
import { Label } from "@coss/ui/components/label";
import { Toggle } from "@coss/ui/components/toggle";
import { BoldIcon, ItalicIcon, LinkIcon } from "lucide-react";

export default function OrganizationProfilePage() {
  return (
    <div className="flex flex-col gap-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Organization profile</CardFrameTitle>
          <CardFrameDescription>
            Manage settings for your organization profile
          </CardFrameDescription>
        </CardFrameHeader>

        <Card className="rounded-t-none!">
          <CardPanel>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex items-center gap-4 max-md:col-span-2">
                <Avatar className="size-16">
                  <AvatarImage
                    alt="Organization logo"
                    src="https://pbs.twimg.com/profile_images/1994776674391457792/7utKOMi6_400x400.jpg"
                  />
                  <AvatarFallback className="text-xl">CC</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <Label className="text-sm">Organization logo</Label>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      Upload logo
                    </Button>
                    <Button size="sm" variant="ghost">
                      Remove
                    </Button>
                  </div>
                </div>
              </div>

              <div className="col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Organization name</FieldLabel>
                  <Input defaultValue="Cal.com" />
                </Field>

                <Field>
                  <FieldLabel>Organization URL</FieldLabel>
                  <InputGroup className="opacity-100! has-disabled:cursor-not-allowed has-disabled:bg-muted has-disabled:text-muted-foreground has-disabled:*:cursor-not-allowed">
                    <InputGroupAddon>
                      <InputGroupText>cal.com/org/</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      aria-label="Set your organization URL"
                      className="*:[input]:ps-0! has-disabled:*:[input]:cursor-not-allowed"
                      defaultValue="calcom"
                      disabled
                    />
                  </InputGroup>
                </Field>
              </div>

              <Field className="col-span-2">
                <FieldLabel>About</FieldLabel>
                <InputGroup>
                  <InputGroupTextarea placeholder="Tell us about your organization…" />
                  <InputGroupAddon
                    align="block-start"
                    className="gap-1 rounded-t-lg border-b bg-muted/72 p-2!"
                  >
                    <Toggle aria-label="Toggle bold" size="sm">
                      <BoldIcon aria-hidden="true" />
                    </Toggle>
                    <Toggle aria-label="Toggle italic" size="sm">
                      <ItalicIcon aria-hidden="true" />
                    </Toggle>
                    <Button aria-label="Link" size="icon-sm" variant="ghost">
                      <LinkIcon aria-hidden="true" />
                    </Button>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </div>
          </CardPanel>
        </Card>

        <CardFrameFooter className="flex justify-end">
          <Button>Update</Button>
        </CardFrameFooter>
      </CardFrame>
    </div>
  );
}
