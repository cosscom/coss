"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { Button } from "@coss/ui/components/button";
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
} from "lucide-react";

export function OrganizationProfileFields() {
  const { copyToClipboard, isCopied } = useCopyToClipboard();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarImage
            alt="Team logo"
            src="https://pbs.twimg.com/profile_images/1994776674391457792/7utKOMi6_400x400.jpg"
          />
          <AvatarFallback className="text-xl">AI</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <Label className="text-sm">Team logo</Label>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel>Team name</FieldLabel>
          <InputGroup>
            <InputGroupInput defaultValue="Acme Inc." />
          </InputGroup>
        </Field>

        <Field>
          <FieldLabel>Team URL</FieldLabel>
          <InputGroup className="opacity-100! has-disabled:cursor-not-allowed has-disabled:bg-muted has-disabled:text-muted-foreground has-disabled:*:cursor-not-allowed">
            <InputGroupAddon>
              <InputGroupText>localhost:3000/team/</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Set your team URL"
              className="*:[input]:ps-0! has-disabled:*:[input]:cursor-not-allowed"
              defaultValue="acme-inc"
            />
          </InputGroup>
        </Field>
      </div>

      <Field className="md:w-1/2">
        <FieldLabel>Team ID</FieldLabel>
        <InputGroup className="opacity-100! has-disabled:cursor-not-allowed has-disabled:bg-muted has-disabled:text-muted-foreground has-disabled:*:cursor-not-allowed">
          <InputGroupInput
            aria-label="Team ID"
            className="has-disabled:*:[input]:cursor-not-allowed"
            defaultValue="47"
            disabled
          />
          <InputGroupAddon align="inline-end">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label="Copy team ID"
                    onClick={() => copyToClipboard("47")}
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
          <InputGroupTextarea placeholder="Tell us about your team…" />
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
          A few sentences about your team. This will appear on your team&apos;s
          url page.
        </FieldDescription>
      </Field>
    </div>
  );
}
