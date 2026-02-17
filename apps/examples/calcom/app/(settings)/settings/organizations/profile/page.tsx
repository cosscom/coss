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
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@coss/ui/components/input-group";
import { Label } from "@coss/ui/components/label";
import { Toggle } from "@coss/ui/components/toggle";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { useCopyToClipboard } from "@coss/ui/hooks/use-copy-to-clipboard";
import {
  BoldIcon,
  CheckIcon,
  CopyIcon,
  ItalicIcon,
  LinkIcon,
  PlusIcon,
} from "lucide-react";

export default function OrganizationProfilePage() {
  const { copyToClipboard, isCopied } = useCopyToClipboard();

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
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="flex items-center gap-4">
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

                <div className="flex items-center gap-4">
                  <Avatar className="size-16">
                    <AvatarFallback>
                      <PlusIcon className="size-6 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm">Cal Video logo</Label>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        Upload Cal Video logo
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid min-h-[150px] w-full place-items-center rounded-md border border-dashed bg-muted/50 sm:min-h-[200px]">
                <div className="flex flex-col items-center gap-3">
                  <p className="text-muted-foreground text-sm">No banner</p>
                  <Button size="sm" variant="outline">
                    Upload banner
                  </Button>
                </div>
              </div>

              <Field>
                <FieldLabel>Organization name</FieldLabel>
                <InputGroup>
                  <InputGroupInput defaultValue="Cal.com" />
                </InputGroup>
              </Field>

              <Field>
                <FieldLabel>Organization URL</FieldLabel>
                <InputGroup className="opacity-100! has-disabled:cursor-not-allowed has-disabled:bg-muted has-disabled:text-muted-foreground has-disabled:*:cursor-not-allowed">
                  <InputGroupInput
                    aria-label="Set your organization URL"
                    className="has-disabled:*:[input]:cursor-not-allowed"
                    defaultValue="calcom"
                    disabled
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>.cal.com</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </Field>

              <Field>
                <FieldLabel>Organization ID</FieldLabel>
                <InputGroup className="opacity-100! has-disabled:cursor-not-allowed has-disabled:bg-muted has-disabled:text-muted-foreground has-disabled:*:cursor-not-allowed">
                  <InputGroupInput
                    aria-label="Organization ID"
                    className="has-disabled:*:[input]:cursor-not-allowed"
                    defaultValue="42"
                    disabled
                  />
                  <InputGroupAddon align="inline-end">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            aria-label="Copy organization ID"
                            onClick={() => copyToClipboard("42")}
                            size="icon-xs"
                            variant="ghost"
                          />
                        }
                      >
                        {isCopied ? <CheckIcon /> : <CopyIcon />}
                      </TooltipTrigger>
                      <TooltipPopup>
                        <p>{isCopied ? "Copied!" : "Copy to clipboard"}</p>
                      </TooltipPopup>
                    </Tooltip>
                  </InputGroupAddon>
                </InputGroup>
              </Field>

              <Field>
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
                <FieldDescription>
                  A few sentences about your organization. This will appear on
                  your organization page.
                </FieldDescription>
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
