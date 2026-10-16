"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@coss/ui/components/avatar";
import { cn } from "@coss/ui/lib/utils";
import { SparklesIcon } from "lucide-react";
import { FactoryLogo } from "../factory-logo";
import type { PersonView } from "./view";

/** Client-side avatars for the thread (the server's `UserAvatar` reads the store). */
export function PersonAvatar({ person, className }: { person: PersonView; className?: string }) {
  return (
    <Avatar className={cn("size-7 border", className)}>
      {person.avatarUrl && <AvatarImage alt="" src={person.avatarUrl} />}
      <AvatarFallback className="bg-muted text-[11px]">{person.initials}</AvatarFallback>
    </Avatar>
  );
}

export function HubAvatar({ className }: { className?: string }) {
  return (
    <Avatar className={cn("size-7 border bg-background", className)}>
      <AvatarFallback className="bg-transparent">
        <SparklesIcon aria-hidden className="size-3.5" />
      </AvatarFallback>
    </Avatar>
  );
}

export function FactoryAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <Avatar className={cn("size-7 bg-foreground text-background", className)}>
      <AvatarFallback className="bg-transparent">
        <FactoryLogo className="size-3.5" name={name} />
      </AvatarFallback>
    </Avatar>
  );
}
