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
} from "@coss/ui/components/input-group";
import { Label } from "@coss/ui/components/label";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { Textarea } from "@coss/ui/components/textarea";
import { EllipsisIcon, PlusIcon, Trash2Icon } from "lucide-react";

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
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>i.cal.com/</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput defaultValue="pasquale" />
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
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {emails.map((item) => (
                      <EmailCard
                        email={item.email}
                        isPrimary={item.isPrimary}
                        isVerified={item.isVerified}
                        key={item.email}
                      />
                    ))}
                  </div>
                  <Button size="sm" variant="outline">
                    <PlusIcon />
                    Add email
                  </Button>
                </div>
              </div>

              <div className="flex flex-col items-start gap-2">
                <Label>About</Label>
                <Textarea className="min-h-32" />
              </div>
            </div>
          </CardPanel>
        </Card>

        <CardFrameFooter className="flex justify-end">
          <Button>Update</Button>
        </CardFrameFooter>
      </CardFrame>

      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle className="text-destructive">
            Danger zone
          </CardFrameTitle>
          <CardFrameDescription>
            Be careful. Account deletion cannot be undone.
          </CardFrameDescription>
        </CardFrameHeader>

        <CardFrameFooter className="flex justify-end">
          <Button variant="outline">
            <Trash2Icon />
            Delete account
          </Button>
        </CardFrameFooter>
      </CardFrame>
    </div>
  );
}

function EmailCard({
  email,
  isPrimary,
  isVerified,
}: {
  email: string;
  isPrimary?: boolean;
  isVerified?: boolean;
}) {
  return (
    <div className="flex flex-1 items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
      <span className="flex-1 truncate text-sm">{email}</span>
      {isPrimary && <Badge variant="success">Primary</Badge>}
      {!isVerified && <Badge variant="warning">Unverified</Badge>}
      <Menu>
        <MenuTrigger
          render={
            <Button
              aria-label="Email options"
              className="size-7"
              size="sm"
              variant="ghost"
            />
          }
        >
          <EllipsisIcon className="size-4" />
        </MenuTrigger>
        <MenuPopup>
          {!isPrimary && <MenuItem>Make primary</MenuItem>}
          {!isVerified && <MenuItem>Resend verification</MenuItem>}
          {!isPrimary && (
            <MenuItem variant="destructive">Remove email</MenuItem>
          )}
        </MenuPopup>
      </Menu>
    </div>
  );
}
