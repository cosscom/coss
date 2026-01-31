import { cn } from "@coss/ui/lib/utils";
import { Button, buttonVariants } from "@coss/ui/components/button";
import { Group, GroupSeparator, GroupText } from "@coss/ui/components/group";
import { ContactRoundIcon, ListFilterIcon, Link2Icon, XIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@coss/ui/components/avatar";

function BookingsFilter() {
  return (
    <div className="flex items-center justify-between gap-2 mt-6">
      <div className="flex items-center gap-2">
        <Group>
          <GroupText className={cn(buttonVariants({
            size: "sm",
            variant: "outline",
          }), "pointer-events-none")}>
            <Link2Icon />
            Event Type
          </GroupText>
          <GroupSeparator />
          <GroupText className={cn(buttonVariants({
            size: "sm",
            variant: "outline",
          }), "pointer-events-none text-muted-foreground")}>
            is
          </GroupText>
          <GroupSeparator />
          <Button variant="outline" size="sm">
            15 Min Meeting
          </Button>
          <GroupSeparator />
          <Button variant="outline" size="icon-sm" aria-label="Remove filter">
            <XIcon />
          </Button>
        </Group>
        <Group>
          <GroupText className={cn(buttonVariants({
            size: "sm",
            variant: "outline",
          }), "pointer-events-none")}>
            <ContactRoundIcon />
            Member
          </GroupText>
          <GroupSeparator />
          <GroupText className={cn(buttonVariants({
            size: "sm",
            variant: "outline",
          }), "pointer-events-none text-muted-foreground")}>
            is any of
          </GroupText>
          <GroupSeparator />
          <Button variant="outline" size="sm">
            <div className="-space-x-1.5 flex">
              <Avatar className="size-3.5 ring ring-background">
                <AvatarImage
                  alt="U1"
                  src="https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=72&h=72&dpr=2&q=80"
                />
                <AvatarFallback>U1</AvatarFallback>
              </Avatar>
              <Avatar className="size-3.5 ring ring-background">
                <AvatarImage
                  alt="U2"
                  src="https://images.unsplash.com/photo-1628157588553-5eeea00af15c?w=72&h=72&dpr=2&q=80"
                />
                <AvatarFallback>U2</AvatarFallback>
              </Avatar>
              <Avatar className="size-3.5 ring ring-background">
                <AvatarImage
                  alt="U3"
                  src="https://images.unsplash.com/photo-1655874819398-c6dfbec68ac7?w=72&h=72&dpr=2&q=80"
                />
                <AvatarFallback>U3</AvatarFallback>
              </Avatar>
            </div>
            3 users
          </Button>
          <GroupSeparator />
          <Button variant="outline" size="icon-sm" aria-label="Remove filter">
            <XIcon />
          </Button>
        </Group>
        <Button variant="ghost" size="icon-sm" aria-label="Add filter">
          <ListFilterIcon />
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm">
          Clear
        </Button>
        <Button variant="outline" size="sm">
          Save
        </Button>
      </div>
    </div>
  );
}

export { BookingsFilter };