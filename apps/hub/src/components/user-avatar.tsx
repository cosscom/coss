import { Avatar, AvatarFallback, AvatarImage } from "@coss/ui/components/avatar";
import { cn } from "@coss/ui/lib/utils";
import { avatarUrl, initials } from "@/lib/avatar";
import { getOrganization, getUser } from "@/lib/store";

/** A person's (or organization's) avatar by handle: their GitHub picture, else initials. */
export function UserAvatar({
  handle,
  className,
  square = false,
}: {
  handle: string;
  className?: string;
  square?: boolean;
}) {
  const subject = getUser(handle) ?? getOrganization(handle);
  const name = subject?.name ?? handle;
  const url = subject ? avatarUrl(subject) : null;
  return (
    <Avatar className={cn("border", square && "rounded-md", className)}>
      {url && <AvatarImage alt="" src={url} />}
      <AvatarFallback className={cn("bg-muted", square && "rounded-md")}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
