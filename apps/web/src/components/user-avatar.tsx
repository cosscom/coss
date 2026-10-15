import { Avatar, AvatarFallback, AvatarImage } from "@coss/ui/components/avatar";
import { initials } from "@/components/shell/initials";

/**
 * A person's avatar: their picture (`avatarUrl` in `@/lib/avatars`) once it loads, else the
 * initials of their name or address. Pictures load from Google, GitHub or Gravatar, without a
 * referrer (dashboard URLs name organizations).
 */
export function UserAvatar(props: {
  user: { name: string; email: string; image: string | null };
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <Avatar className={props.className}>
      {props.user.image ? (
        <AvatarImage
          alt=""
          className="rounded-[inherit]"
          referrerPolicy="no-referrer"
          src={props.user.image}
        />
      ) : null}
      <AvatarFallback className={props.fallbackClassName}>
        {initials(props.user.name || props.user.email)}
      </AvatarFallback>
    </Avatar>
  );
}
