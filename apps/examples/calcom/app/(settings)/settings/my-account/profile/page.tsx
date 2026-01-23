"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { Badge } from "@coss/ui/components/badge";
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
import { Input } from "@coss/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@coss/ui/components/input-group";
import { Label } from "@coss/ui/components/label";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@coss/ui/components/menu";
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
  EllipsisIcon,
  ItalicIcon,
  LinkIcon,
  PlusIcon,
} from "lucide-react";

function EmailInput({
  email,
  isPrimary,
  isVerified,
}: {
  email: string;
  isPrimary?: boolean;
  isVerified?: boolean;
}) {
  return (
    <InputGroup>
      <InputGroupInput defaultValue={email} type="email" />
      <InputGroupAddon align="inline-end">
        {isPrimary && <Badge variant="info">Primary</Badge>}
        {!isVerified && <Badge variant="warning">Unverified</Badge>}
        <Menu>
          <MenuTrigger
            render={
              <Button
                aria-label="Email options"
                size="icon-xs"
                variant="ghost"
              />
            }
          >
            <EllipsisIcon />
          </MenuTrigger>
          <MenuPopup align="end" alignOffset={-4} sideOffset={8}>
            <MenuItem disabled={isPrimary}>Make primary</MenuItem>
            <MenuItem disabled={isVerified}>Resend verification</MenuItem>
            <MenuItem disabled={isPrimary} variant="destructive">
              Remove email
            </MenuItem>
          </MenuPopup>
        </Menu>
      </InputGroupAddon>
    </InputGroup>
  );
}

interface EmailItem {
  email: string;
  isPrimary?: boolean;
  isVerified?: boolean;
}

const emails: EmailItem[] = [
  { email: "pasquale@cal.com", isPrimary: true, isVerified: true },
  { email: "test@sfsfd.com", isPrimary: false, isVerified: false },
];

export default function ProfileSettingsPage() {
  const { copyToClipboard, isCopied } = useCopyToClipboard();

  return (
    <div className="space-y-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Profile</CardFrameTitle>
          <CardFrameDescription>
            Manage settings for your Cal.com profile
          </CardFrameDescription>
        </CardFrameHeader>

        <Card className="rounded-b-none!">
          <CardPanel>
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="size-16">
                  <AvatarImage
                    alt="Profile picture"
                    src="https://pbs.twimg.com/profile_images/1994776674391457792/7utKOMi6_400x400.jpg"
                  />
                  <AvatarFallback className="text-xl">PV</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <Label className="text-sm">Profile picture</Label>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      Upload avatar
                    </Button>
                    <Button size="sm" variant="ghost">
                      Remove
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start gap-2">
                <Label>Username</Label>
                <InputGroup className="opacity-100! has-disabled:cursor-not-allowed has-disabled:bg-muted has-disabled:text-muted-foreground has-disabled:*:cursor-not-allowed">
                  <InputGroupAddon>
                    <InputGroupText>i.cal.com/</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    aria-label="Set your URL"
                    className="*:[input]:ps-0! has-disabled:*:[input]:cursor-not-allowed"
                    defaultValue="pasquale"
                    disabled
                  />
                  <InputGroupAddon align="inline-end">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            aria-label="Copy URL"
                            onClick={() =>
                              copyToClipboard("https://i.cal.com/pasquale")
                            }
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
                <p className="text-muted-foreground text-xs">
                  Tip: You can add a &apos;+&apos; between usernames (e.g.
                  cal.com/anna+brian) to meet with multiple people
                </p>
              </div>

              <div className="flex flex-col items-start gap-2">
                <Label>Full name</Label>
                <Input defaultValue="Pasquale Vitiello" />
              </div>

              <div className="flex flex-col items-start gap-2">
                <Label>Email</Label>
                <div className="w-full space-y-2">
                  {emails.map((item) => (
                    <EmailInput
                      email={item.email}
                      isPrimary={item.isPrimary}
                      isVerified={item.isVerified}
                      key={item.email}
                    />
                  ))}
                  <Button size="sm" variant="outline">
                    <PlusIcon />
                    Add email
                  </Button>
                </div>
              </div>

              <div className="flex flex-col items-start gap-2">
                <Label>About</Label>
                <InputGroup>
                  <InputGroupTextarea placeholder="Tell us about yourself…" />
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
              </div>
            </div>
          </CardPanel>
        </Card>

        <CardFrameFooter className="flex justify-end">
          <Button>Update</Button>
        </CardFrameFooter>
      </CardFrame>

      <CardFrame className="flex-row items-center justify-between">
        <CardFrameHeader>
          <CardFrameTitle>Danger zone</CardFrameTitle>
          <CardFrameDescription>
            Be careful. Account deletion cannot be undone.
          </CardFrameDescription>
        </CardFrameHeader>

        <CardFrameFooter className="flex justify-end">
          <Button variant="destructive-outline">Delete account</Button>
        </CardFrameFooter>
      </CardFrame>
    </div>
  );
}
